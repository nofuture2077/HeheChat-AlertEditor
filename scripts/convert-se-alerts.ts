import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import sharp from 'sharp';
import crypto from 'crypto';

export async function hashObjectSHA256(obj: any): Promise<string> {
    const str = JSON.stringify(obj);
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Variable mapping for text replacements
const variableMap: Record<string, string> = {
    '{name}': '${username}',
    '{sender}': '${username}',
    '{amount}': '${amount}',
    '{currency}': "€"
};

// Function to replace variables in text using the mapping
const replaceVariables = (text: string): string => {
    return Object.entries(variableMap).reduce(
        (acc, [from, to]) => acc.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to),
        text
    );
};

import { 
    EventAlertConfig, 
    EventType,
    EventMainType,
    EventAlert,
    Base64File,
    EventAlertSpecifier,
    EventTypeMapping
} from '../src/components/types';
import { generateGUID } from '../src/components/helper';

type StreamElementsAlert = {
    name: string;
    type: string;
    condition: string;
    requirement: number | string;
    settings: {
        text: {
            message: string;
        };
        graphics?: {
            src: string;
            name: string;
        };
        audio?: {
            src: string;
            name: string;
            volume: number;
        };
        tts?: {
            enabled: boolean;
            voice: string;
            volume: number;
        };
    };
};

async function convertAudioToMp3(buffer: Buffer): Promise<Buffer> {
    const tempInputPath = path.join(process.cwd(), `temp-${Date.now()}.raw`);
    const tempOutputPath = path.join(process.cwd(), `temp-${Date.now()}.mp3`);
    
    try {
        // Write the input buffer to a temporary file
        fs.writeFileSync(tempInputPath, buffer);
        
        // Convert to MP3 using ffmpeg
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', tempInputPath,
                '-acodec', 'libmp3lame',
                '-ab', '192k',
                tempOutputPath
            ]);
            
            ffmpeg.on('close', (code: number) => {
                if (code === 0) resolve(null);
                else reject(new Error(`ffmpeg exited with code ${code}`));
            });
        });
        
        // Read the converted file
        const convertedBuffer = fs.readFileSync(tempOutputPath);
        
        return convertedBuffer;
    } finally {
        // Clean up temporary files
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    }
}

function sanitizeFileName(name: string): string {
    // Remove file extension
    const baseName = name.replace(/\.[^/.]+$/, '');
    
    // Replace special characters and spaces
    return baseName
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
}

async function isAnimatedGif(buffer: Buffer): Promise<boolean> {
    const tempPath = path.join(process.cwd(), `temp-${Date.now()}.gif`);
    try {
        fs.writeFileSync(tempPath, buffer);
        
        const result = await new Promise<boolean>((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-select_streams', 'v:0',
                '-count_frames',
                '-show_entries', 'stream=nb_read_frames',
                '-print_format', 'default=nokey=1:noprint_wrappers=1',
                tempPath
            ]);
            
            let output = '';
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            ffprobe.on('close', (code) => {
                if (code === 0) {
                    const frames = parseInt(output.trim());
                    resolve(frames > 1);
                } else {
                    reject(new Error(`ffprobe exited with code ${code}`));
                }
            });
        });
        
        return result;
    } catch (error) {
        console.error('Error checking if GIF is animated:', error);
        return false;
    } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

async function convertToAnimatedWebP(buffer: Buffer, inputExt: string): Promise<Buffer> {
    const tempInputPath = path.join(process.cwd(), `temp-${Date.now()}.${inputExt}`);
    const tempOutputPath = path.join(process.cwd(), `temp-${Date.now()}.webp`);
    
    try {
        // Write the input buffer to a temporary file
        fs.writeFileSync(tempInputPath, buffer);
        
        // Convert to animated WebP using ffmpeg
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', tempInputPath,
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure even dimensions
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-compression_level', '6',
                '-q:v', '80',
                '-loop', '0',
                '-preset', 'picture',
                '-an',
                '-vsync', '0',
                tempOutputPath
            ]);
            
            ffmpeg.on('close', (code: number) => {
                if (code === 0) resolve(null);
                else reject(new Error(`ffmpeg exited with code ${code}`));
            });
        });
        
        // Read the converted file
        return fs.readFileSync(tempOutputPath);
    } finally {
        // Clean up temporary files
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    }
}

async function convertToWebP(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
        // Handle MP4 videos
        if (mimeType === 'video/mp4') {
            const webpBuffer = await convertToAnimatedWebP(buffer, 'mp4');
            return { buffer: webpBuffer, mimeType: 'image/webp' };
        }

        // Handle GIFs
        if (mimeType === 'image/gif') {
            const isAnimated = await isAnimatedGif(buffer);
            if (isAnimated) {
                // Use ffmpeg for animated GIFs
                const webpBuffer = await convertToAnimatedWebP(buffer, 'gif');
                return { buffer: webpBuffer, mimeType: 'image/webp' };
            } else {
                // Use sharp for static GIFs
                const webpBuffer = await sharp(buffer)
                    .webp({
                        quality: 80,
                        lossless: false
                    })
                    .toBuffer();
                return { buffer: webpBuffer, mimeType: 'image/webp' };
            }
        }

        // Handle static images with sharp
        const webpBuffer = await sharp(buffer)
            .webp({
                quality: 80,
                lossless: false,
                force: true
            })
            .toBuffer();
        return { buffer: webpBuffer, mimeType: 'image/webp' };
    } catch (error) {
        console.error('Error converting to WebP:', error);
        return { buffer, mimeType }; // Return original buffer if conversion fails
    }
}

async function downloadAndConvertToBase64(url: string, alertType?: string): Promise<{ base64: string; mimeType: string; fileName: string }> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const originalMimeType = getMimeType(url);
        
        const originalBuffer = Buffer.from(response.data);
        let finalBuffer = originalBuffer;
        let finalMimeType = originalMimeType;
        
        // Generate a readable filename
        const originalName = path.basename(url);
        const sanitizedName = sanitizeFileName(originalName);
        const prefix = alertType ? `${alertType}_` : '';
        const finalName = `${prefix}${sanitizedName}`;
        
        // Convert to WebP if it's an image
        if (originalMimeType.startsWith('image/')) {
            const { buffer, mimeType } = await convertToWebP(originalBuffer, originalMimeType);
            finalBuffer = buffer;
            finalMimeType = mimeType;
        }
        // Convert to MP3 if it's audio
        else if (originalMimeType.startsWith('audio/')) {
            finalBuffer = await convertAudioToMp3(originalBuffer);
            finalMimeType = 'audio/mpeg';
        }
        
        return {
            base64: finalBuffer.toString('base64'),
            mimeType: finalMimeType,
            fileName: finalName + (finalMimeType === 'audio/mpeg' ? '.mp3' : '.webp')
        };
    } catch (error) {
        console.error(`Failed to download file from ${url}:`, error);
        return {
            base64: '',
            mimeType: 'application/octet-stream',
            fileName: 'error.bin'
        };
    }
}

function getMimeType(url: string): string {
    const ext = path.extname(url).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.gif': 'image/gif',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.webm': 'video/webm',
        '.mp4': 'video/mp4'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

function getFileType(mimeType: string): 'audio' | 'image' | 'video' {
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'image';
}

function mapConditionToSpecifier(condition: string, requirement: number | string): EventAlertSpecifier {
    switch (condition) {
        case 'EXACT':
            return {
                type: 'exact',
                amount: typeof requirement === 'number' ? requirement : 0
            };
        case 'ATLEAST':
            return {
                type: 'min',
                amount: typeof requirement === 'number' ? requirement : 0
            };
        default:
            return {
                type: 'min',
                amount: 0
            };
    }
}

function mapStreamElementsType(type: string, alertType: string, tier?: string): EventType | undefined {
    console.log(type, alertType);
    if (alertType === 'tip') {
        return 'donation';
    }
    if (alertType === 'cheer') {
        return 'cheer';
    }
    switch (type) {
        case 'communityGift':
            return 'subgift_1000';
        case 'subscriber':
            return 'sub_1000';
        case 'gift':
            return 'subgiftb_1000';
        case 'tier':
            return tier === 'prime' ? 'sub_Prime' : 'sub_1000';
        case 'raid':
            return 'raid';
        case 'follow':
            return 'follow';
        case 'cheer':
            return 'cheer';
        default:
            return 'sub_1000';
    }
}

async function convertAlert(
    seAlert: StreamElementsAlert, 
    files: Record<string, Base64File>, 
    urlToFileId: Record<string, string>,
    alertType: string
): Promise<EventAlert> {
    const id = generateGUID();
    const alert: EventAlert = {
        id,
        name: seAlert.name || 'Unnamed Alert',
        type: mapStreamElementsType(seAlert.type, alertType) || 'donation',
        specifier: mapConditionToSpecifier(seAlert.condition, seAlert.requirement),
        restriction: 'none',
        visual: {
            headline: replaceVariables(seAlert.settings.text.message),
            text: "${text}"
        }
    };
    console.log(alert.type);

    // Handle graphics
    if (seAlert.settings.graphics?.src) {
        const graphicsUrl = seAlert.settings.graphics.src;
        let fileId: string;

        // Check if we've already processed this URL
        if (urlToFileId[graphicsUrl]) {
            fileId = urlToFileId[graphicsUrl];
        } else {
            fileId = uuidv4();
            const { base64: base64Data, mimeType, fileName } = await downloadAndConvertToBase64(graphicsUrl, alertType);
            const fileType = getFileType(mimeType);
            
            files[fileId] = {
                id: fileId,
                type: fileType,
                name: fileName,
                mime: mimeType,
                data: base64Data
            };
            urlToFileId[graphicsUrl] = fileId;
        }

        if (alert.visual) {
            alert.visual.element = fileId;
        }
    }

    // Handle audio
    if (seAlert.settings.audio?.src) {
        const audioUrl = seAlert.settings.audio.src;
        const fileName = seAlert.settings.audio.name;
        let fileId: string;

        // Check if we've already processed this URL
        if (urlToFileId[audioUrl]) {
            fileId = urlToFileId[audioUrl];
        } else {
            fileId = generateGUID();
            const { base64: base64Data, mimeType } = await downloadAndConvertToBase64(audioUrl, alertType);
            
            files[fileId] = {
                id: fileId,
                type: 'audio',
                name: fileName,
                mime: mimeType,
                data: base64Data
            };
            urlToFileId[audioUrl] = fileId;
        }

        alert.audio = {
            jingle: fileId
        };

        if (seAlert.settings.tts?.enabled) {
            alert.audio.tts = {
                voiceType: 'google',
                voiceSpecifier: seAlert.settings.tts.voice,
                voiceParams: {
                    volume: seAlert.settings.tts.volume
                },
                text: replaceVariables(seAlert.settings.text.message) + " ${text}"
            };
        }
    }

    return alert;
}

async function convertStreamElementsConfig(seConfig: any): Promise<EventAlertConfig> {
    const files: Record<string, Base64File> = {};
    const urlToFileId: Record<string, string> = {}; // Track which URLs have been processed
    const alerts: Record<EventMainType, EventAlert[]> = {
        sub: [],
        subgift: [],
        subgiftb: [],
        raid: [],
        follow: [],
        donation: [],
        cheer: [],
        channelPointRedemption: []
    };

    // Process subscriber alerts
    const subWidget = seConfig.overlay.widgets.find((w: any) => w.type === 'se-widget-alert-box');
    if (subWidget) {
        // Process main alerts
        for (const eventType of ['subscriber', 'tip', 'cheer', 'raid', 'follow']) {
            const eventData = subWidget.variables[eventType];
            if (eventData?.enabled) {
                const mainAlert = await convertAlert({
                    name: `Default ${eventType}`,
                    type: eventType,
                    condition: 'ATLEAST',
                    requirement: eventData.minAmount || 0,
                    settings: {
                        text: { message: eventData.text.message },
                        graphics: eventData.graphics,
                        audio: eventData.audio,
                        tts: eventData.tts
                    }
                }, files, urlToFileId, eventType);

                const mappedType = EventTypeMapping[mainAlert.type as EventType];
                if (mappedType && alerts[mappedType]) {
                    alerts[mappedType].push(mainAlert);
                }
            }

            // Process variations
            if (eventData?.variations) {
                for (const variation of eventData.variations) {
                    if (variation.enabled) {
                        const varAlert = await convertAlert({
                            ...variation,
                            settings: variation.settings
                        }, files, urlToFileId, eventType);

                        const mappedType = EventTypeMapping[varAlert.type as EventType];
                        if (mappedType && alerts[mappedType]) {
                            alerts[mappedType].push(varAlert);
                        }
                    }
                }
            }
        }
    }

    const config: EventAlertConfig = {
        meta: {
            channel: seConfig.channel.username || '',
            name: seConfig.overlay.name ||  seConfig.channel.username + ' Alerts',
            guid: generateGUID(),
            lastUpdate: new Date().toISOString()
        },
        data: {
            alerts,
            files
        }
    };

    config.meta.hash = hashObjectSHA256(config.data);

    // Log URL reuse statistics
    const urlStats = {
        totalUrls: Object.keys(urlToFileId).length,
        totalFiles: Object.keys(files).length,
        duplicatesAvoided: Object.keys(urlToFileId).length - Object.keys(files).length
    };
    console.log('\nURL Processing Statistics:');
    console.log(`Total Unique URLs: ${urlStats.totalUrls}`);
    console.log(`Total Files Created: ${urlStats.totalFiles}`);
    console.log(`Duplicates Avoided: ${urlStats.duplicatesAvoided}`);

    return config;
}

// Main execution
async function main() {
    try {
        const seConfigPath = path.join(process.cwd(), 'data', 'foxer_alert_se.json');
        const seConfig = JSON.parse(fs.readFileSync(seConfigPath, 'utf8'));
        
        const convertedConfig = await convertStreamElementsConfig(seConfig);
        
        const outputPath = path.join(process.cwd(), 'data', convertedConfig.meta.channel + '.json');
        fs.writeFileSync(outputPath, JSON.stringify(convertedConfig, null, 2));
        
        console.log('Conversion completed successfully!');
        console.log(`Output saved to: ${outputPath}`);
        
        // Log statistics
        const stats = {
            totalFiles: Object.keys(convertedConfig.data?.files || {}).length,
            alertsByType: Object.entries(convertedConfig.data?.alerts || {}).reduce((acc, [type, alerts]) => {
                acc[type] = alerts.length;
                return acc;
            }, {} as Record<string, number>)
        };
        
        console.log('\nConversion Statistics:');
        console.log(`Total Files: ${stats.totalFiles}`);
        console.log('Alerts by Type:');
        Object.entries(stats.alertsByType).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
    } catch (error) {
        console.error('Error during conversion:', error);
        process.exit(1);
    }
}

main();