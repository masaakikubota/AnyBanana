import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { UploadedImage, ImageInfoForAPI } from './types';
import { generateImages } from './services/geminiService';

// --- Helpers ---
const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve((reader.result as string).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// --- UI Icons ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4 4v12" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// --- Local storage ---
type HistoryItem = { url: string; createdAt: number; prompt?: string };
const HISTORY_KEY = 'NB_GENERATED_HISTORY_V1';

const loadHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (items: HistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {}
};

export default function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [count, setCount] = useState<number>(4);
  const [uploaded, setUploaded] = useState<UploadedImage[]>([]);
  const [generating, setGenerating] = useState<boolean>(false);
  const [results, setResults] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const arr: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      const preview = await fileToDataUrl(file);
      arr.push({ id: `${Date.now()}_${file.name}`, file, preview });
    }
    setUploaded(prev => [...prev, ...arr]);
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => onFiles(e.target.files);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const imgs: ImageInfoForAPI[] = [];
      for (const u of uploaded) {
        const base64 = await fileToBase64(u.file);
        imgs.push({ id: u.id, filename: u.file.name, mimeType: u.file.type, base64Data: base64 });
      }
      const urls = await generateImages(prompt.trim(), imgs, count);
      const filtered = urls.filter(Boolean);
      setResults(filtered);
      if (filtered.length) {
        const toAdd: HistoryItem[] = filtered.map(u => ({ url: u, createdAt: Date.now(), prompt: prompt.trim() }));
        const newHistory = [...toAdd, ...history];
        setHistory(newHistory);
        saveHistory(newHistory);
      }
    } catch (e) {
      console.error(e);
      alert('画像生成でエラーが発生しました。APIキーやネットワークをご確認ください。');
    } finally {
      setGenerating(false);
    }
  }, [prompt, uploaded, count, history]);

  return (
    <div className="min-h-screen bg-brand-gray-900 text-brand-light">
      <header className="px-6 py-4 border-b border-brand-gray-800 sticky top-0 bg-brand-gray-900/80 backdrop-blur z-10">
        <h1 className="text-2xl font-bold">NanoBanana Prompt Optimizer</h1>
      </header>

      <main className="px-6 py-6 space-y-10">
        {/* Start Optimization */}
        <section>
          <h2 className="text-xl font-semibold mb-3">最適化を開始</h2>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3 space-y-4">
              <textarea
                className="w-full h-28 p-3 rounded bg-brand-gray-800 border border-brand-gray-700 outline-none"
                placeholder="ゴールや生成したいイメージを日本語で入力してください…"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <span>生成枚数</span>
                  <select
                    className="bg-brand-gray-800 border border-brand-gray-700 rounded px-2 py-1"
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                  >
                    {[1,2,3,4,5,6].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  className="inline-flex items-center gap-2 bg-brand-blue hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded"
                >
                  {generating ? '生成中…' : '画像を生成'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm mb-2">参考画像（任意・複数可）</label>
              <div className="border border-dashed border-brand-gray-700 rounded p-4 text-center">
                <input id="file-input" type="file" accept="image/*" multiple onChange={onFileChange} className="hidden" />
                <label htmlFor="file-input" className="cursor-pointer inline-flex items-center gap-2 text-brand-blue">
                  <UploadIcon className="w-5 h-5" /> 画像を選択
                </label>
                {uploaded.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {uploaded.map(u => (
                      <img key={u.id} src={u.preview} className="w-full h-16 object-cover rounded" alt="uploaded" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Past Gallery below Start section */}
        {history.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">過去の生成ギャラリー</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {history.map((h, idx) => (
                <button key={idx} onClick={() => setModalUrl(h.url)} className="group relative">
                  <img src={h.url} alt="history" className="w-full h-32 object-cover rounded border border-brand-gray-800 group-hover:opacity-90" />
                  {h.prompt && (
                    <div className="absolute bottom-0 inset-x-0 text-[10px] bg-black/50 px-1 py-0.5 truncate">{h.prompt}</div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Current Results */}
        {results.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">今回の生成結果</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.map((url, i) => (
                <button key={i} onClick={() => setModalUrl(url)}>
                  <img src={url} alt={`generated-${i}`} className="w-full h-40 object-cover rounded border border-brand-gray-800 hover:opacity-90" />
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal */}
      {modalUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalUrl(null)}>
          <div className="relative max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute -top-3 -right-3 bg-brand-gray-800 rounded-full p-2" onClick={() => setModalUrl(null)}>
              <CloseIcon className="w-5 h-5" />
            </button>
            <img src={modalUrl} alt="preview" className="max-w-full max-h-[90vh] rounded shadow-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
