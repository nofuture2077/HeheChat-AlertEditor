import { Base64File, EventAlert, EventAlertConfig, EventMainType } from '../../../src/components/types';
import { generateGUID, hashObjectSHA256 } from '../../../src/components/helper';
import { ConversionPlan, DEFAULT_VOICE, MediaJob } from './mapping';
import { download, MediaConverter, MediaResult } from './media';

export type FileStatus = 'queued' | 'downloading' | 'converting' | 'done' | 'error';

export type FileProgress = {
    fileId: string;
    url: string;
    name: string;
    status: FileStatus;
    progress: number;
    originalSize?: number;
    finalSize?: number;
    message?: string;
};

export type ConversionResult = {
    config: EventAlertConfig;
    warnings: string[];
};

function emptyAlerts(): Record<EventMainType, EventAlert[]> {
    return {
        sub: [],
        subgift: [],
        subgiftb: [],
        raid: [],
        follow: [],
        donation: [],
        cheer: [],
        channelPointRedemption: [],
        kofi: [],
        hypetrain: [],
        tts: [],
        streak: []
    };
}

// Same default the editor creates in AlertConfigurator.ensureConfigStructure
function readChatAlert(): EventAlert {
    return {
        name: 'Read Chat',
        id: generateGUID(),
        type: 'tts',
        specifier: { type: 'min', amount: 0 },
        restriction: 'none',
        audio: {
            tts: {
                voiceType: 'default',
                voiceSpecifier: '',
                voiceParams: {},
                text: '${username}: ${text}'
            }
        }
    };
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function uniqueName(baseName: string, ext: string, used: Set<string>): string {
    let name = `${baseName}.${ext}`;
    for (let counter = 1; used.has(name); counter++) {
        name = `${baseName}_${counter}.${ext}`;
    }
    used.add(name);
    return name;
}

export async function buildConfig(plan: ConversionPlan, files: Record<string, Base64File>): Promise<EventAlertConfig> {
    const alerts = emptyAlerts();
    for (const { mainType, alert } of plan.alerts) {
        // Drop references to files that failed to download
        if (alert.visual?.element && !files[alert.visual.element]) alert.visual.element = undefined;
        if (alert.audio?.jingle && !files[alert.audio.jingle]) alert.audio.jingle = undefined;
        alerts[mainType].push(alert);
    }
    alerts.tts.push(readChatAlert());

    const config: EventAlertConfig = {
        meta: {
            channel: plan.channel,
            name: plan.name,
            guid: generateGUID(),
            hash: '',
            lastUpdate: new Date().toISOString()
        },
        data: {
            alerts,
            files,
            config: {
                ttsReplacements: {},
                defaultVoice: DEFAULT_VOICE
            }
        }
    };
    config.meta.hash = await hashObjectSHA256(config.data);
    return config;
}

export async function runConversion(
    plan: ConversionPlan,
    onUpdate: (files: FileProgress[]) => void,
    signal?: AbortSignal
): Promise<ConversionResult> {
    const progress: FileProgress[] = plan.media.map(job => ({
        fileId: job.fileId,
        url: job.url,
        name: job.baseName,
        status: 'queued',
        progress: 0
    }));
    const update = (index: number, patch: Partial<FileProgress>) => {
        progress[index] = { ...progress[index], ...patch };
        onUpdate([...progress]);
    };
    onUpdate([...progress]);

    const converter = new MediaConverter();
    // Stops a running ffmpeg job immediately instead of waiting for the next file
    signal?.addEventListener('abort', () => converter.terminate());
    const files: Record<string, Base64File> = {};
    const usedNames = new Set<string>();
    const warnings = [...plan.skipped.map(s => `Skipped ${s}`)];

    const convertJob = async (job: MediaJob, index: number): Promise<MediaResult> => {
        update(index, { status: 'downloading', progress: 0 });
        const bytes = await download(job.url, p => update(index, { progress: p }), signal);
        update(index, { status: 'converting', progress: 0, originalSize: bytes.length });
        try {
            return await converter.convert(bytes, job.url, p => update(index, { progress: p }));
        } catch (error) {
            if (signal?.aborted) throw error;
            warnings.push(`${job.baseName}: conversion failed, kept original file (${(error as Error).message})`);
            const ext = job.url.split('?')[0].split('.').pop()?.toLowerCase() || 'bin';
            const type = job.kind === 'audio' ? 'audio' : ext === 'webm' || ext === 'mp4' ? 'video' : 'image';
            return { data: bytes, mime: `${type}/${ext}`, ext, type };
        }
    };

    try {
        for (const [index, job] of plan.media.entries()) {
            if (signal?.aborted) throw new DOMException('Conversion cancelled', 'AbortError');
            try {
                const result = await convertJob(job, index);
                const name = uniqueName(job.baseName, result.ext, usedNames);
                files[job.fileId] = {
                    id: job.fileId,
                    type: result.type,
                    name,
                    mime: result.mime,
                    data: bytesToBase64(result.data)
                };
                update(index, { status: 'done', progress: 1, name, finalSize: result.data.length });
            } catch (error) {
                if (signal?.aborted) throw new DOMException('Conversion cancelled', 'AbortError');
                const message = (error as Error).message;
                warnings.push(`${job.baseName}: ${message}. Alerts using it were created without this file.`);
                update(index, { status: 'error', message });
            }
        }
    } finally {
        converter.terminate();
    }

    return { config: await buildConfig(plan, files), warnings };
}
