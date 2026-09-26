import {
    EventAlert,
    EventAlertSpecifier,
    EventAlertTTS,
    EventMainType,
    EventType,
    EventTypeMapping
} from '../../../src/components/types';
import { generateGUID } from '../../../src/components/helper';
import { ALERT_BOX_WIDGET, SEAlertSettings, SEEvent, SEExport, SEVariation } from './seTypes';

// A unique media URL referenced by one or more alerts. The file id is assigned
// up front so alerts can reference it before the media is converted.
export type MediaJob = {
    fileId: string;
    url: string;
    kind: 'graphics' | 'audio';
    baseName: string;
};

export type PlannedAlert = {
    mainType: EventMainType;
    alert: EventAlert;
};

export type ConversionPlan = {
    channel: string;
    name: string;
    alerts: PlannedAlert[];
    media: MediaJob[];
    skipped: string[];
};

type SEEventConfig = {
    label: string;
    type: EventType;
    namePrefix?: string;
    hasMessage?: boolean;
};

// StreamElements alert-box keys -> HeheChat event type
const SE_EVENTS: Record<string, SEEventConfig> = {
    follower: { label: 'Follow', type: 'follow' },
    subscriber: { label: 'Subscriber', type: 'sub_1000', hasMessage: true },
    tip: { label: 'Tip', type: 'donation', hasMessage: true },
    cheer: { label: 'Cheer', type: 'cheer', hasMessage: true },
    raid: { label: 'Raid', type: 'raid' },
    // Twitch removed hosts, keep them as additional raid alerts
    host: { label: 'Host', type: 'raid', namePrefix: 'Host: ' }
};

const baseVariables: Record<string, string> = {
    '{name}': '${username}',
    '{sender}': '${username}',
    '{amount}': '${amount}',
    '{count}': '${amount}',
    '{message}': '${text}',
    '{currency}': '€'
};

// For a received gift sub, SE's {name} is the recipient and {sender} the gifter
const giftVariables: Record<string, string> = {
    ...baseVariables,
    '{name}': '${usernameTo}'
};

export const DEFAULT_VOICE = {
    voiceType: 'google' as const,
    voiceSpecifier: 'de-DE-Standard-A',
    voiceParams: { speed: 1 }
};

export function replaceVariables(text: string, variables: Record<string, string> = baseVariables): string {
    return text.replace(/\{\w+\}/g, (match) => variables[match] ?? match);
}

function mapSpecifier(variation?: SEVariation, minAmount?: number): EventAlertSpecifier {
    if (!variation) {
        return { type: 'min', amount: Number(minAmount) || 0 };
    }
    const amount = Number(variation.requirement) || 0;
    // SE leaves the requirement empty for gift variations, "exactly 0" would never match
    return { type: variation.condition === 'EXACT' && amount > 0 ? 'exact' : 'min', amount };
}

function mapVariationType(eventKey: string, variation: SEVariation): EventType | undefined {
    const base = SE_EVENTS[eventKey].type;
    if (eventKey !== 'subscriber') {
        return base;
    }
    switch (variation.type) {
        case 'gift':
            return 'subgiftb_1000';
        case 'communityGift':
            return 'subgift_1000';
        case 'tier':
            // HeheChat matches alerts by main type and amount only, a tier
            // variation would fire randomly for every sub
            return undefined;
        default:
            return base;
    }
}

const UUID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeName(name: string): string {
    return name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^\p{L}\p{N}]+/gu, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
}

// SE sometimes stores UTF-8 file names decoded as Latin-1 ("FÃ\u009cR" instead of "FÜR")
function fixEncoding(name: string): string {
    try {
        return decodeURIComponent(escape(name));
    } catch {
        return name;
    }
}

function mediaBaseName(url: string, eventKey: string, alertName: string, originalName?: string): string {
    const fileName = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
    const stem = fileName.replace(/\.[^/.]+$/, '');
    const candidate = (originalName && fixEncoding(originalName)) || (stem && !UUID_NAME.test(stem) ? fileName : alertName);
    return `${eventKey}_${sanitizeName(candidate) || 'alert'}`;
}

export function planConversion(se: SEExport): ConversionPlan {
    const alerts: PlannedAlert[] = [];
    const mediaByUrl = new Map<string, MediaJob>();
    const skipped = new Set<string>();
    // Every alert box widget has all event types enabled by default, drop the identical copies
    const seen = new Set<string>();

    const mediaRef = (url: string | undefined, kind: MediaJob['kind'], eventKey: string, alertName: string, originalName?: string) => {
        if (!url) return undefined;
        let job = mediaByUrl.get(url);
        if (!job) {
            job = { fileId: generateGUID(), url, kind, baseName: mediaBaseName(url, eventKey, alertName, originalName) };
            mediaByUrl.set(url, job);
        }
        return job.fileId;
    };

    const addAlert = (eventKey: string, type: EventType, name: string, settings: SEAlertSettings,
        specifier: EventAlertSpecifier, variables: Record<string, string>, widgetPrefix: string) => {
        const config = SE_EVENTS[eventKey];
        const key = JSON.stringify([type, specifier, settings.text?.message, settings.graphics?.src,
            settings.audio?.src, config.hasMessage && settings.tts?.enabled]);
        if (seen.has(key)) return;
        seen.add(key);
        const alertName = widgetPrefix + (config.namePrefix || '') + name;
        const jingle = mediaRef(settings.audio?.src, 'audio', eventKey, alertName, settings.audio?.name);
        const element = mediaRef(settings.graphics?.src, 'graphics', eventKey, alertName);
        const tts: EventAlertTTS | undefined = (config.hasMessage && settings.tts?.enabled) ? {
            text: '${text}',
            voiceType: 'default',
            voiceSpecifier: '',
            voiceParams: {}
        } : undefined;

        const alert: EventAlert = {
            id: generateGUID(),
            name: alertName,
            type,
            specifier,
            restriction: 'none',
            minDuration: settings.duration && settings.duration > 0 ? settings.duration : undefined,
            visual: {
                headline: replaceVariables(settings.text?.message || '', variables),
                text: '${text}',
                position: '',
                layout: '',
                element
            },
            audio: { jingle, tts }
        };
        alerts.push({ mainType: EventTypeMapping[type], alert });
    };

    const widgets = se.overlay.widgets.filter(w => w.type === ALERT_BOX_WIDGET && w.visible !== false);
    for (const widget of widgets) {
        const widgetPrefix = widgets.length > 1 && widget.name ? `${widget.name} / ` : '';
        for (const [eventKey, value] of Object.entries(widget.variables)) {
            const event = value as SEEvent;
            if (!event || typeof event !== 'object' || !('variations' in event || 'text' in event)) continue;
            const config = SE_EVENTS[eventKey];
            if (!config) {
                if (event.enabled) skipped.add(`${eventKey} (not supported by HeheChat)`);
                continue;
            }

            if (event.enabled) {
                addAlert(eventKey, config.type, config.label, event, mapSpecifier(undefined, event.minAmount), baseVariables, widgetPrefix);
            }

            for (const variation of event.variations || []) {
                if (variation.enabled === false || !variation.settings) continue;
                const type = mapVariationType(eventKey, variation);
                if (!type) {
                    skipped.add(`${eventKey} variation "${variation.name}" (tier specific alerts are not supported)`);
                    continue;
                }
                const variables = variation.type === 'gift' ? giftVariables : baseVariables;
                if (variation.type === 'name') {
                    const usernames = String(variation.requirement || '').split(',').map(x => x.trim()).filter(Boolean);
                    for (const username of usernames) {
                        addAlert(eventKey, type, `${variation.name} (${username})`, variation.settings,
                            { type: 'matches', attribute: 'username', text: username }, variables, widgetPrefix);
                    }
                    continue;
                }
                addAlert(eventKey, type, variation.name || config.label, variation.settings, mapSpecifier(variation), variables, widgetPrefix);
            }
        }
    }

    const channel = se.channel?.username || '';
    return {
        channel,
        name: se.overlay.name || `${channel} Alerts`,
        alerts,
        media: Array.from(mediaByUrl.values()),
        skipped: Array.from(skipped)
    };
}
