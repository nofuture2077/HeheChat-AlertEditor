import { useState, useContext, useEffect } from 'react';
import { 
    Modal, 
    Fieldset, 
    Group, 
    Button, 
    Select, 
    Stack, 
    Text, 
    Alert,
    ActionIcon
} from '@mantine/core';
import { IconAlertCircle, IconMusic } from '@tabler/icons-react';
import { AppContext } from '../ApplicationContext';
import { previewTTS } from './helper';

interface DefaultVoiceEditorProps {
    opened: boolean;
    onClose: () => void;
}

export function DefaultVoiceEditor({ opened, onClose }: DefaultVoiceEditorProps) {
    const appContext = useContext(AppContext);
    
    // Initialize state from current config
    const currentDefaultVoice = appContext.alertConfig.data?.config?.defaultVoice;
    const [voiceType, setVoiceType] = useState<'ai' | 'google'>(currentDefaultVoice?.voiceType || 'google');
    const [voice, setVoice] = useState<string>(currentDefaultVoice?.voiceSpecifier || '');
    
    // Initialize selectedLanguage based on the existing voice if available
    const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
        if (currentDefaultVoice?.voiceType === 'google' && currentDefaultVoice?.voiceSpecifier) {
            // Try to find the voice in googleVoices
            const voiceData = appContext.googleVoices.find(v => v.name === currentDefaultVoice?.voiceSpecifier);
            if (voiceData && voiceData.languageCodes.length > 0) {
                return voiceData.languageCodes[0];
            }
        }
        return 'de-DE'; // Default to German
    });

    // Update state when context changes or when modal is opened
    useEffect(() => {
        if (opened) {
            const currentDefaultVoice = appContext.alertConfig.data?.config?.defaultVoice;
            
            if (currentDefaultVoice) {
                setVoiceType(currentDefaultVoice.voiceType || 'google');
                setVoice(currentDefaultVoice.voiceSpecifier || '');
                
                if (currentDefaultVoice.voiceType === 'google' && currentDefaultVoice.voiceSpecifier) {
                    const voiceData = appContext.googleVoices.find(v => v.name === currentDefaultVoice.voiceSpecifier);
                    if (voiceData && voiceData.languageCodes.length > 0) {
                        setSelectedLanguage(voiceData.languageCodes[0]);
                    }
                }
            }
        }
    }, [appContext.alertConfig.data?.config?.defaultVoice, opened, appContext.googleVoices]);

    const handleSave = () => {
        const config = { ...appContext.alertConfig };
        
        // Ensure config structure exists
        if (!config.data) {
            config.data = {
                alerts: {
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
                },
                files: {}
            };
        }
        
        if (!config.data.config) {
            config.data.config = {};
        }

        // Save the default voice configuration
        config.data.config.defaultVoice = {
            voiceType,
            voiceSpecifier: voice,
            voiceParams: {}
        };

        appContext.setAlertConfig(config);
        onClose();
    };

    const handleCancel = () => {
        // Reset to original state
        const currentDefaultVoice = appContext.alertConfig.data?.config?.defaultVoice;
        setVoiceType(currentDefaultVoice?.voiceType || 'google');
        setVoice(currentDefaultVoice?.voiceSpecifier || '');
        
        if (currentDefaultVoice?.voiceType === 'google' && currentDefaultVoice?.voiceSpecifier) {
            const voiceData = appContext.googleVoices.find(v => v.name === currentDefaultVoice?.voiceSpecifier);
            if (voiceData && voiceData.languageCodes.length > 0) {
                setSelectedLanguage(voiceData.languageCodes[0]);
            }
        }
        
        onClose();
    };

    const handlePreviewTTS = () => {
        // When previewing the default voice in the editor, we pass the current editor state directly
        // We don't use "default" voice type here since we want to preview the actual voice being configured
        previewTTS(
            'This is a preview of the default voice.',
            voiceType,
            voice,
            appContext.alertConfig.meta.channel,
            appContext.sink || '',
            undefined // No need to pass defaultVoice since we're previewing the voice directly
        );
    };

    const voiceTypes = appContext.aiVoices.length ? ['ai', 'google'] : ['google'];

    return (
        <Modal
            opened={opened}
            onClose={handleCancel}
            title="Default Voice Configuration"
            size="md"
        >
            <Stack gap="md">
                <Fieldset legend="Voice Settings">
                    <Stack gap="sm">
                        <Select 
                            label="TTS System" 
                            data={voiceTypes} 
                            value={voiceType} 
                            onChange={(value) => setVoiceType(value as 'ai' | 'google' || 'google')} 
                        />
                        
                        {voiceType === 'ai' ? (
                            <Select 
                                label="AI Voice" 
                                data={appContext.aiVoices.map((voice: {voice_id: string, name: string, category: string}) => ({
                                    value: voice.voice_id,
                                    label: voice.category + " - " + voice.name
                                }))} 
                                value={voice} 
                                onChange={(value) => setVoice(value || '')} 
                            />
                        ) : (
                            <>
                                <Select
                                    label="Language"
                                    data={Array.from(new Set(appContext.googleVoices.map(v => v.languageCodes[0]))).sort().map(lang => {
                                        // Map language codes to more user-friendly names
                                        const languageNames: Record<string, string> = {
                                            'af-ZA': 'Afrikaans',
                                            'am-ET': 'Amharic',
                                            'ar-XA': 'Arabic',
                                            'bg-BG': 'Bulgarian',
                                            'bn-IN': 'Bengali',
                                            'ca-ES': 'Catalan',
                                            'cmn-CN': 'Chinese (Mandarin)',
                                            'cmn-TW': 'Chinese (Taiwanese)',
                                            'cs-CZ': 'Czech',
                                            'da-DK': 'Danish',
                                            'de-DE': 'German',
                                            'el-GR': 'Greek',
                                            'en-AU': 'English (Australia)',
                                            'en-GB': 'English (UK)',
                                            'en-IN': 'English (India)',
                                            'en-US': 'English (US)',
                                            'es-ES': 'Spanish (Spain)',
                                            'es-US': 'Spanish (US)',
                                            'et-EE': 'Estonian',
                                            'eu-ES': 'Basque',
                                            'fi-FI': 'Finnish',
                                            'fil-PH': 'Filipino',
                                            'fr-CA': 'French (Canada)',
                                            'fr-FR': 'French',
                                            'gl-ES': 'Galician',
                                            'gu-IN': 'Gujarati',
                                            'he-IL': 'Hebrew',
                                            'hi-IN': 'Hindi',
                                            'hu-HU': 'Hungarian',
                                            'id-ID': 'Indonesian',
                                            'is-IS': 'Icelandic',
                                            'it-IT': 'Italian',
                                            'ja-JP': 'Japanese',
                                            'kn-IN': 'Kannada',
                                            'ko-KR': 'Korean',
                                            'lt-LT': 'Lithuanian',
                                            'lv-LV': 'Latvian',
                                            'ml-IN': 'Malayalam',
                                            'mr-IN': 'Marathi',
                                            'ms-MY': 'Malay',
                                            'nb-NO': 'Norwegian',
                                            'nl-BE': 'Dutch (Belgium)',
                                            'nl-NL': 'Dutch',
                                            'pa-IN': 'Punjabi',
                                            'pl-PL': 'Polish',
                                            'pt-BR': 'Portuguese (Brazil)',
                                            'pt-PT': 'Portuguese',
                                            'ro-RO': 'Romanian',
                                            'ru-RU': 'Russian',
                                            'sk-SK': 'Slovak',
                                            'sr-RS': 'Serbian',
                                            'sv-SE': 'Swedish',
                                            'sw-KE': 'Swahili',
                                            'ta-IN': 'Tamil',
                                            'te-IN': 'Telugu',
                                            'th-TH': 'Thai',
                                            'tr-TR': 'Turkish',
                                            'uk-UA': 'Ukrainian',
                                            'ur-IN': 'Urdu',
                                            'vi-VN': 'Vietnamese',
                                            'yue-HK': 'Cantonese'
                                        };
                                        
                                        return {
                                            value: lang,
                                            label: languageNames[lang] || lang
                                        };
                                    })}
                                    value={selectedLanguage}
                                    onChange={(value) => {
                                        setSelectedLanguage(value || 'de-DE');
                                        // Reset voice when language changes
                                        const voicesForLanguage = appContext.googleVoices.filter(v => 
                                            v.languageCodes.includes(value || 'de-DE')
                                        );
                                        if (voicesForLanguage.length > 0) {
                                            setVoice(voicesForLanguage[0].name);
                                        }
                                    }}
                                />
                                <Select
                                    label="Voice"
                                    data={appContext.googleVoices
                                        .filter(v => v.languageCodes.includes(selectedLanguage))
                                        .map(v => ({
                                            value: v.name,
                                            label: `${v.name.replace(/[a-z]+-[a-zA-Z]+-/, '')} (${v.ssmlGender})`
                                        }))}
                                    value={voice}
                                    onChange={(value) => setVoice(value || '')}
                                />
                            </>
                        )}
                        
                        {voice && (
                            <Group justify="center">
                                <ActionIcon 
                                    variant="filled" 
                                    color="blue" 
                                    size="lg"
                                    title="Preview Default Voice"
                                    onClick={handlePreviewTTS}
                                >
                                    <IconMusic size={18} />
                                </ActionIcon>
                                <Text size="sm" c="dimmed">Preview Default Voice</Text>
                            </Group>
                        )}
                    </Stack>
                </Fieldset>

                {/* Premium warning for non-Standard Google voices */}
                {voiceType === 'google' && voice && !voice.includes('Standard') && !appContext.isPremium && (
                    <Alert 
                        icon={<IconAlertCircle size={16} />} 
                        title="Premium Required" 
                        color="red" 
                        variant="filled"
                    >
                        You need a premium subscription to use non-Standard Google voices. Please upgrade or select a Standard voice.
                    </Alert>
                )}

                <Group justify="space-between" mt="md">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave}
                        disabled={(voiceType === 'google' && voice && !voice.includes('Standard') && !appContext.isPremium) || !voice}
                    >
                        Save Default Voice
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
