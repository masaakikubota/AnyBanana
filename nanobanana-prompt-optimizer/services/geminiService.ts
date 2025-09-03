import { GoogleGenAI, Modality } from "@google/genai";
import { QUESTIONS_PHASE_PROMPT, FINAL_PHASE_PROMPT } from '../constants';
import { Question, ImageMetadata, Answers, ImageInfoForAPI } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJson = (text: string): string => {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    return match ? match[1] : text;
};

export const getStepBackQuestions = async (goal: string, images: ImageMetadata[]): Promise<{questions: Question[], draft?: string}> => {
    const input = {
        goal: goal,
        n_images: images.length,
        aspect_ratio: null,
        images: images,
        locale: "ja-JP"
    };

    const prompt = `${QUESTIONS_PHASE_PROMPT}\n\nINPUT (JSON)\n${JSON.stringify(input, null, 2)}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const jsonString = cleanJson(response.text);
    const result = JSON.parse(jsonString);

    if (result.phase !== 'questions' || !Array.isArray(result.questions)) {
        throw new Error("Invalid response format from API for questions phase.");
    }

    return {questions: result.questions, draft: result.draft};
};

export const getFinalPrompt = async (goal: string, images: ImageMetadata[], answers: Answers): Promise<{ final_prompt: string, notes?: string }> => {
    const input = {
        original_input: {
            goal: goal,
            n_images: images.length,
            aspect_ratio: null,
            images: images,
            locale: "ja-JP"
        },
        answers: answers
    };

    const prompt = `${FINAL_PHASE_PROMPT}\n\nUSER ANSWERS (JSON)\n${JSON.stringify(input, null, 2)}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Using flash as pro is not available, but it is powerful enough for this.
        contents: prompt,
    });

    const jsonString = cleanJson(response.text);
    const result = JSON.parse(jsonString);

    if (result.phase !== 'final' || typeof result.final_prompt !== 'string') {
        throw new Error("Invalid response format from API for final prompt phase.");
    }
    
    return { final_prompt: result.final_prompt, notes: result.notes };
};

export const generateImages = async (prompt: string, inputImages: ImageInfoForAPI[], count: number): Promise<string[]> => {
    const generationPromises = Array(count).fill(0).map(async (_, index) => {
        try {
            const parts: ({ text: string } | { inlineData: { data: string, mimeType: string } })[] = [];

            inputImages.forEach(img => {
                parts.push({
                    inlineData: {
                        data: img.base64Data,
                        mimeType: img.mimeType,
                    },
                });
            });

            parts.push({ text: `${prompt}\n\nVariation: ${index + 1}` });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                }
            }
            // Fallback if no image is generated in a specific call
            return '';
        } catch (error) {
            console.error(`Error generating image ${index + 1}:`, error);
            return ''; // Return empty string on error for this specific image
        }
    });

    const results = await Promise.all(generationPromises);
    return results.filter(url => url); // Filter out any empty strings from failed generations
};
