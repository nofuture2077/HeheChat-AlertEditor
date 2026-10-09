import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

export type FileKind = 'audio' | 'image' | 'video';

export type MediaResult = {
    data: Uint8Array;
    mime: string;
    ext: string;
    type: FileKind;
};

type SourceFormat = { mime: string; ext: string; type: FileKind };

const FORMATS: Record<string, SourceFormat> = {
    mp3: { mime: 'audio/mpeg', ext: 'mp3', type: 'audio' },
    ogg: { mime: 'audio/ogg', ext: 'ogg', type: 'audio' },
    wav: { mime: 'audio/wav', ext: 'wav', type: 'audio' },
    gif: { mime: 'image/gif', ext: 'gif', type: 'image' },
    png: { mime: 'image/png', ext: 'png', type: 'image' },
    jpg: { mime: 'image/jpeg', ext: 'jpg', type: 'image' },
    webp: { mime: 'image/webp', ext: 'webp', type: 'image' },
    webm: { mime: 'video/webm', ext: 'webm', type: 'video' },
    mp4: { mime: 'video/mp4', ext: 'mp4', type: 'video' }
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));

// Detect the real format from magic bytes, fall back to the URL extension
export function detectFormat(bytes: Uint8Array, url: string): SourceFormat | undefined {
    if (ascii(bytes, 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return FORMATS.mp3;
    if (ascii(bytes, 0, 4) === 'OggS') return FORMATS.ogg;
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return FORMATS.wav;
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return FORMATS.webp;
    if (ascii(bytes, 0, 4) === 'GIF8') return FORMATS.gif;
    if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return FORMATS.png;
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return FORMATS.jpg;
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return FORMATS.webm;
    if (ascii(bytes, 4, 4) === 'ftyp') return FORMATS.mp4;

    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    return ext === 'jpeg' ? FORMATS.jpg : FORMATS[ext || ''];
}

// Walks the GIF block structure and reports whether there is more than one frame
export function isAnimatedGif(bytes: Uint8Array): boolean {
    const skipSubBlocks = (pos: number) => {
        while (pos < bytes.length && bytes[pos] !== 0) pos += bytes[pos] + 1;
        return pos + 1;
    };
    let pos = 13;
    if (bytes[10] & 0x80) pos += 3 * (1 << ((bytes[10] & 0x07) + 1));
    let frames = 0;
    while (pos < bytes.length) {
        const block = bytes[pos];
        if (block === 0x21) {
            pos = skipSubBlocks(pos + 2);
        } else if (block === 0x2c) {
            if (++frames > 1) return true;
            const flags = bytes[pos + 9];
            pos += 10;
            if (flags & 0x80) pos += 3 * (1 << ((flags & 0x07) + 1));
            pos = skipSubBlocks(pos + 1);
        } else {
            break;
        }
    }
    return false;
}

export async function download(url: string, onProgress: (progress: number) => void, signal?: AbortSignal): Promise<Uint8Array> {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    const total = Number(response.headers.get('Content-Length')) || 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) onProgress(Math.min(received / total, 1));
    }
    const data = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
    }
    return data;
}

export class MediaConverter {
    private ffmpeg = this.create();
    private loading?: Promise<unknown>;
    private onProgress?: (progress: number) => void;
    private logs: string[] = [];

    private create() {
        const ffmpeg = new FFmpeg();
        ffmpeg.on('progress', ({ progress }) => {
            this.onProgress?.(Math.max(0, Math.min(progress, 1)));
        });
        ffmpeg.on('log', ({ message }) => {
            this.logs.push(message);
            if (this.logs.length > 30) this.logs.shift();
        });
        return ffmpeg;
    }

    load() {
        this.loading ||= this.ffmpeg.load({ coreURL, wasmURL });
        return this.loading;
    }

    terminate() {
        this.ffmpeg.terminate();
        this.loading = undefined;
    }

    // A crashed wasm instance rejects every following call, start a fresh one
    private restart() {
        this.terminate();
        this.ffmpeg = this.create();
    }

    async convert(bytes: Uint8Array, url: string, onProgress: (progress: number) => void): Promise<MediaResult> {
        const source = detectFormat(bytes, url);
        if (!source) {
            throw new Error('Unknown file format');
        }

        switch (source.ext) {
            case 'mp3':
            case 'webp':
            case 'webm':
                return { data: bytes, ...source };
            case 'mp4':
                // libopus and libvpx-vp9 crash in the ffmpeg.wasm core, VP8 + Vorbis work
                return this.run(bytes, source, onProgress, FORMATS.webm,
                    ['-c:v', 'libvpx', '-crf', '10', '-b:v', '2M', '-deadline', 'good', '-cpu-used', '4', '-c:a', 'libvorbis']);
            case 'ogg':
            case 'wav':
                return this.run(bytes, source, onProgress, FORMATS.mp3,
                    ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k']);
            case 'gif':
                if (isAnimatedGif(bytes)) {
                    return this.run(bytes, source, onProgress, FORMATS.webp,
                        ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libwebp_anim', '-lossless', '0',
                            '-compression_level', '6', '-q:v', '80', '-loop', '0', '-an', '-fps_mode', 'passthrough']);
                }
                return this.toWebP(bytes, source, onProgress);
            default:
                return this.toWebP(bytes, source, onProgress);
        }
    }

    // Static images go through the canvas encoder, ffmpeg is the fallback for
    // browsers that can't encode WebP (Safari)
    private async toWebP(bytes: Uint8Array, source: SourceFormat, onProgress: (progress: number) => void): Promise<MediaResult> {
        try {
            const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: source.mime }));
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
            bitmap.close();
            const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
            if (blob.type === 'image/webp') {
                onProgress(1);
                return { data: new Uint8Array(await blob.arrayBuffer()), ...FORMATS.webp };
            }
        } catch (error) {
            console.warn('Canvas WebP encoding failed, falling back to ffmpeg', error);
        }
        return this.run(bytes, source, onProgress, FORMATS.webp, ['-c:v', 'libwebp', '-lossless', '0', '-q:v', '80']);
    }

    private async run(bytes: Uint8Array, source: SourceFormat, onProgress: (progress: number) => void,
        target: SourceFormat, args: string[]): Promise<MediaResult> {
        await this.load();
        const input = `input.${source.ext}`;
        const output = `output.${target.ext}`;
        this.onProgress = onProgress;
        this.logs = [];
        try {
            // writeFile transfers the buffer to the worker, pass a copy
            await this.ffmpeg.writeFile(input, bytes.slice());
            let code: number;
            try {
                code = await this.ffmpeg.exec(['-i', input, ...args, output]);
            } catch (error) {
                console.error('ffmpeg crashed', error, this.logs);
                this.restart();
                throw new Error(`ffmpeg crashed: ${error instanceof Error ? error.message : String(error)}`);
            }
            if (code !== 0) {
                console.error('ffmpeg failed', this.logs);
                throw new Error(`ffmpeg exited with code ${code}: ${this.logs.slice(-2).join(' ')}`);
            }
            const data = await this.ffmpeg.readFile(output);
            if (typeof data === 'string' || !data.length) {
                throw new Error('ffmpeg produced no output');
            }
            return { data, ...target };
        } finally {
            this.onProgress = undefined;
            await this.ffmpeg.deleteFile(input).catch(() => undefined);
            await this.ffmpeg.deleteFile(output).catch(() => undefined);
        }
    }
}
