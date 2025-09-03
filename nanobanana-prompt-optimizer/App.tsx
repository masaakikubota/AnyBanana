import React, { useState, useCallback, useMemo, ChangeEvent, DragEvent, useEffect, useRef } from 'react';
import { AppState, UploadedImage, Question, Answers, ImageMetadata, ImageInfoForAPI } from './types';
import { getStepBackQuestions, getFinalPrompt, generateImages } from './services/geminiService';

// --- HELPER FUNCTIONS ---
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


const getImageMetadata = (file: File, id: string): Promise<ImageMetadata> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
            const commonDivisor = gcd(img.width, img.height);
            resolve({
                id,
                filename: file.name,
                mimeType: file.type,
                width: img.width,
                height: img.height,
                ar: `${img.width / commonDivisor}:${img.height / commonDivisor}`
            });
            URL.revokeObjectURL(objectUrl);
        };
        img.onerror = reject;
        img.src = objectUrl;
    });
};

// --- SVG ICONS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4 4v12" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2" />
    </svg>
);
