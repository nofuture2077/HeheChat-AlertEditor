import { ALERT_BOX_WIDGET, isSEExport, SEExport } from './seTypes';

const API = 'https://api.streamelements.com/kappa/v2';

export type SEOverlay = {
    id: string;
    name: string;
    updatedAt?: string;
    preview?: string;
    alertBoxes: number;
    export: SEExport;
};

type TokenPayload = {
    channel?: string;
    exp?: number;
};

// The JWT from the StreamElements dashboard carries the channel (account) id
export function parseToken(token: string): { channelId: string } {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
        throw new Error('This is not a valid JWT token.');
    }
    let payload: TokenPayload;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    } catch {
        throw new Error('This is not a valid JWT token.');
    }
    if (!payload.channel) {
        throw new Error('The token does not contain a StreamElements channel.');
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('The token has expired. Copy a fresh one from your StreamElements account settings.');
    }
    return { channelId: payload.channel };
}

async function request<T>(path: string, token: string): Promise<T> {
    const response = await fetch(API + path, {
        headers: { accept: 'application/json', authorization: `Bearer ${token.trim()}` }
    });
    if (response.status === 401 || response.status === 403) {
        throw new Error('StreamElements rejected the token. Check that you copied the complete JWT token.');
    }
    if (!response.ok) {
        throw new Error(`StreamElements API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

// Lists all overlays of the channel and returns those containing an alert box.
// The overlay list has no widget info, so every overlay's bootstrap is loaded.
export async function loadAlertOverlays(token: string, onProgress?: (done: number, total: number) => void): Promise<SEOverlay[]> {
    const { channelId } = parseToken(token);
    const { docs } = await request<{ docs: { _id: string; name: string; updatedAt?: string; preview?: string }[] }>(
        `/overlays/${channelId}`, token);

    let done = 0;
    onProgress?.(done, docs.length);
    const overlays = await Promise.all(docs.map(async (doc): Promise<SEOverlay | undefined> => {
        const bootstrap = await request<SEExport>(
            `/overlays/${doc._id}/bootstrap?isEditor=true&isMobile=false&isObs=false&isObsLive=false&isXsplit=false`, token);
        onProgress?.(++done, docs.length);
        if (!isSEExport(bootstrap)) return undefined;
        return {
            id: doc._id,
            name: doc.name || bootstrap.overlay.name || doc._id,
            updatedAt: doc.updatedAt,
            preview: doc.preview,
            alertBoxes: bootstrap.overlay.widgets.filter(w => w.type === ALERT_BOX_WIDGET && w.visible !== false).length,
            export: bootstrap
        };
    }));

    return overlays
        .filter((o): o is SEOverlay => !!o)
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
