// Subset of the StreamElements overlay export that the converter reads.

export type SETextCss = {
    'font-family'?: string;
    'font-size'?: number | string;
    'text-align'?: string;
    color?: string;
    highlights?: { color?: string };
    message?: {
        'font-family'?: string;
        'font-size'?: number | string;
        color?: string;
    };
};

export type SEText = {
    message: string;
    animation?: string;
    css?: SETextCss;
};

export type SEGraphics = {
    src?: string;
    type?: 'image' | 'video' | string;
    volume?: number;
};

export type SEAudio = {
    src?: string;
    name?: string;
    volume?: number;
};

export type SETTS = {
    enabled?: boolean;
    voice?: string;
    volume?: number;
    minAmount?: number;
};

export type SEAlertSettings = {
    enabled?: boolean;
    duration?: number;
    text: SEText;
    graphics?: SEGraphics;
    audio?: SEAudio;
    tts?: SETTS;
    showMessage?: boolean;
};

export type SEVariation = {
    name: string;
    type?: 'amount' | 'tier' | 'gift' | 'communityGift' | 'name' | string;
    condition?: 'ATLEAST' | 'EXACT' | string;
    requirement?: number | string;
    enabled?: boolean;
    settings: SEAlertSettings;
};

export type SEEvent = SEAlertSettings & {
    minAmount?: number;
    variations?: SEVariation[];
};

export type SEWidget = {
    type: string;
    name?: string | null;
    visible?: boolean;
    listeners?: Record<string, boolean>;
    css?: {
        top?: number | string;
        left?: number | string;
        width?: number | string;
        height?: number | string;
    };
    text?: { css?: SETextCss };
    variables: Record<string, SEEvent | unknown>;
};

export type SEExport = {
    overlay: {
        name?: string;
        settings?: { width?: number; height?: number };
        widgets: SEWidget[];
    };
    channel?: {
        username?: string;
    };
};

export const ALERT_BOX_WIDGET = 'se-widget-alert-box';

export function isSEExport(value: any): value is SEExport {
    return Array.isArray(value?.overlay?.widgets) &&
        value.overlay.widgets.some((w: SEWidget) => w?.type === ALERT_BOX_WIDGET);
}
