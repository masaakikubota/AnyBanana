
export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export interface ImageMetadata {
  id: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  ar: string;
}

export interface ImageInfoForAPI {
    id: string;
    filename: string;
    mimeType: string;
    base64Data: string;
}


export interface Question {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  rationale: string;
}

export type AppState =
  | 'idle'
  | 'loadingQuestions'
  | 'awaitingAnswers'
  | 'generatingPrompt'
  | 'generatingImages'
  | 'complete'
  | 'error';

export type Answers = Record<string, string | string[]>;
