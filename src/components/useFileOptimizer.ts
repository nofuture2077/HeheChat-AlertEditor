import { useState } from 'react';
import { bytesToBase64 } from './helper';
import type { MediaConverter } from './media';

export type FileType = 'audio' | 'image' | 'video' | 'application/zip';

export type OptimizedFile = {
    name: string;
    mime: string;
    type: FileType;
    data: string;
    originalName: string;
    originalSize: number;
    size: number;
    converted: boolean;
    warning?: string;
};

// Formats the alert player can use as they are, everything else has to be converted
const PLAYABLE = ['audio/mpeg', 'image/webp', 'video/webm'];

// The media module pulls in ffmpeg, load it and the converter only when the first file is dropped
let converter: Promise<MediaConverter> | undefined;
const getConverter = () => converter ||= import('./media').then(({ MediaConverter }) => new MediaConverter());

const typeFromMime = (mime: string): FileType =>
    mime.startsWith('audio') ? 'audio' : mime.startsWith('video') ? 'video' : 'image';

const withExtension = (name: string, ext: string) => {
    const dot = name.lastIndexOf('.');
    return `${dot > 0 ? name.substring(0, dot) : name}.${ext}`;
};

export function useFileOptimizer() {
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);

    const optimize = async (file: File): Promise<OptimizedFile> => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const original: OptimizedFile = {
            name: file.name,
            mime: file.type,
            type: file.type === 'application/zip' ? 'application/zip' : typeFromMime(file.type),
            data: bytesToBase64(bytes),
            originalName: file.name,
            originalSize: file.size,
            size: file.size,
            converted: false
        };
        if (file.type === 'application/zip') {
            return original;
        }

        setBusy(true);
        setProgress(0);
        try {
            const result = await (await getConverter()).convert(bytes, file.name, setProgress);
            if (result.data === bytes) {
                return { ...original, mime: result.mime, type: result.type };
            }
            return {
                name: withExtension(file.name, result.ext),
                mime: result.mime,
                type: result.type,
                data: bytesToBase64(result.data),
                originalName: file.name,
                originalSize: file.size,
                size: result.data.length,
                converted: true
            };
        } catch (error) {
            console.error('Converting file failed', error);
            const message = error instanceof Error ? error.message : String(error);
            if (PLAYABLE.includes(file.type)) {
                return { ...original, warning: `Optimizing failed, the original file is used: ${message}` };
            }
            throw new Error(`The file could not be converted: ${message}`);
        } finally {
            setBusy(false);
        }
    };

    return { optimize, busy, progress };
}
