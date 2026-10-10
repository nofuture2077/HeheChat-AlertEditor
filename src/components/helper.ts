import humanizeDuration from "humanize-duration"

export function generateGUID(): string {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

export async function hashObjectSHA256(obj: any): Promise<string> {
    const str = JSON.stringify(obj);
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export async function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result ? reader.result + "" : '');
      reader.onerror = error => reject(error);
    });
}

export function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function getQueryVariable(query: String, variable: String): string | undefined {
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const shortEnglishHumanizer = humanizeDuration.humanizer({
    language: "shortEn",
    languages: {
        shortEn: {
            y: () => "y",
            mo: () => "mo",
            w: () => "w",
            d: () => "d",
            h: () => "h",
            m: () => "m",
            s: () => "s",
            ms: () => "ms",
        },
    },
});


export const formatDuration = (duration: number) => {
    return shortEnglishHumanizer(duration, { largest: 1 });
}

const formatFunctions: { [key: string]: (value: any) => string } = {
    whole: (value: number) => Number(value).toFixed(0),
    decimal: (value: number) => Number(value).toFixed(2),
    uppercase: (value: string) => value.toUpperCase(),
    lowercase: (value: string) => value.toLowerCase(),
    duration: (value: string) => formatDuration(Number(value) * 1000),
};

export function formatString(messageTemplate: string, args: Record<string, any>): string {
    return messageTemplate.replace(/\${(\w+)(?::(\w+))?}/g, (_, key, formatFunction) => {
        const value = args[key];
        if (formatFunction && formatFunctions[formatFunction]) {
            return formatFunctions[formatFunction](value);
        }
        return String(value ?? '');
    });
}

// TTS volume is stored in voiceParams.volume as a gain factor, 1.0 when not set
export function parseVolume(value: string | number | undefined): number {
    const volume = Number(value);
    return value !== undefined && value !== '' && Number.isFinite(volume) ? volume : 1.0;
}

export async function previewTTS(
    text: string, 
    voiceType: 'ai' | 'google' | 'none' | 'default', 
    voice: string, 
    channel: string, 
    sink: string,
    defaultVoice?: { voiceType: 'ai' | 'google'; voiceSpecifier: string; voiceParams: Record<string, string | number> },
    speed?: number,
    volume?: number
): Promise<void> {
    // Handle default voice type
    let actualVoiceType = voiceType;
    let actualVoice = voice;
    
    if (voiceType === 'default') {
        if (!defaultVoice) {
            console.error('Default voice type selected but no default voice configuration provided');
            alert('No default voice configured. Please configure a default voice first.');
            return;
        }
        actualVoiceType = defaultVoice.voiceType;
        actualVoice = defaultVoice.voiceSpecifier;
    }
    
    if (actualVoiceType === 'none') {
        console.log('TTS is disabled (voice type: none)');
        return;
    }

    // Create the context before the first await so it is started by the click, a context created
    // after the fetch can stay suspended and never play
    const audioContext = new AudioContext();
    audioContext.resume();
    
    // Replace variables in the text
    const previewText = formatString(text, {
        username: "Peter453",
        usernameTo: "HannaOG",
        amount: 5,
        amount2: 10,
        text: "Hallo"
    });
    
    // Determine endpoint based on voice type
    const endpoint = actualVoiceType === 'ai' ? (import.meta.env.VITE_BACKEND_URL + '/tts/ai/generate') : (import.meta.env.VITE_BACKEND_URL + '/tts/generate');
    
    // Construct URL with query parameters
    const url = `${endpoint}?text=${encodeURIComponent(previewText)}&voice=${encodeURIComponent(actualVoice)}&channel=${encodeURIComponent(channel)}&preview=true&sink=${encodeURIComponent(sink || '')}`;
    
    try {
        // Fetch the audio file
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);
        }
        
        // Get the audio data as blob
        const audioBlob = await response.json();

        
        // Create and play audio element, routed through a gain node so volumes above 100% work
        const audio = new Audio("data:audio/mp3;base64," + audioBlob.audioContent);
        audio.playbackRate = speed ?? 1.0;
        const gain = audioContext.createGain();
        gain.gain.value = volume ?? 1.0;
        audioContext.createMediaElementSource(audio).connect(gain).connect(audioContext.destination);
        audio.addEventListener('ended', () => audioContext.close(), { once: true });

        // Play the audio
        await audio.play();
    } catch (error) {
        audioContext.close();
        console.error('Error playing TTS preview:', error);
        alert('Failed to play TTS preview. See console for details.');
    }
}
