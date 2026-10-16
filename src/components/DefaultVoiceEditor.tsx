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
    ActionIcon,
    Slider,
    TextInput
} from '@mantine/core';
import { IconCrown, IconMusic } from '@tabler/icons-react';
import { AppContext } from '../ApplicationContext';
import { getVoicePreviewText, isProVoice, LANGUAGE_NAMES, parseVolume, PREMIUM_URL, previewTTS } from './helper';

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
    const [speed, setSpeed] = useState<number>(Number(currentDefaultVoice?.voiceParams?.speed) || 1.0);
    const [volume, setVolume] = useState<number>(parseVolume(currentDefaultVoice?.voiceParams?.volume));

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

    // Text typed by the user for the preview, null while the localized sample text is used
    const [customPreviewText, setCustomPreviewText] = useState<string | null>(null);

    // Update state when context changes or when modal is opened
    useEffect(() => {
        if (opened) {
            const currentDefaultVoice = appContext.alertConfig.data?.config?.defaultVoice;
            
            if (currentDefaultVoice) {
                setVoiceType(currentDefaultVoice.voiceType || 'google');
                setVoice(currentDefaultVoice.voiceSpecifier || '');
                setSpeed(Number(currentDefaultVoice.voiceParams?.speed) || 1.0);
                setVolume(parseVolume(currentDefaultVoice.voiceParams?.volume));

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
            voiceParams: { speed, volume }
        };

        appContext.setAlertConfig(config);
        onClose();
    };

    const handleCancel = () => {
        // Reset to original state
        const currentDefaultVoice = appContext.alertConfig.data?.config?.defaultVoice;
        setVoiceType(currentDefaultVoice?.voiceType || 'google');
        setVoice(currentDefaultVoice?.voiceSpecifier || '');
        setSpeed(Number(currentDefaultVoice?.voiceParams?.speed) || 1.0);
        setVolume(parseVolume(currentDefaultVoice?.voiceParams?.volume));

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
            previewText,
            voiceType,
            voice,
            appContext.alertConfig.meta.channel,
            appContext.sink || '',
            undefined, // No need to pass defaultVoice since we're previewing the voice directly
            speed,
            volume
        );
    };

    const voiceTypes = appContext.aiVoices.length ? ['ai', 'google'] : ['google'];
    // AI voices have no language selection, so they preview in German
    const previewText = customPreviewText ?? getVoicePreviewText(voiceType === 'google' ? selectedLanguage : 'de-DE');
    const proVoiceSelected = voiceType === 'google' && !!voice && isProVoice(voice) && !appContext.isPremium;

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
                                    data={Array.from(new Set(appContext.googleVoices.map(v => v.languageCodes[0]))).sort().map(lang => ({
                                        value: lang,
                                        label: LANGUAGE_NAMES[lang] || lang
                                    }))}
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
                                            label: `${v.name.replace(/[a-z]+-[a-zA-Z]+-/, '')} (${v.ssmlGender})${isProVoice(v.name) && !appContext.isPremium ? ' · Pro' : ''}`
                                        }))}
                                    value={voice}
                                    onChange={(value) => setVoice(value || '')}
                                />
                            </>
                        )}
                        
                        <Text size="sm" fw={500}>Speed</Text>
                        <Slider
                            value={speed}
                            onChange={(value) => setSpeed(value)}
                            min={0.5}
                            max={2.0}
                            step={0.1}
                            label={(value) => value.toFixed(1)}
                            marks={[
                                { value: 0.5, label: '0.5x' },
                                { value: 1.0, label: '1.0x' },
                                { value: 1.5, label: '1.5x' },
                                { value: 2.0, label: '2.0x' }
                            ]}
                            mb="md"
                        />

                        <Text size="sm" fw={500}>Volume</Text>
                        <Slider
                            value={volume}
                            onChange={(value) => setVolume(value)}
                            min={0}
                            max={3.0}
                            step={0.05}
                            label={(value) => Math.round(value * 100) + '%'}
                            marks={[
                                { value: 0, label: '0%' },
                                { value: 1.0, label: '100%' },
                                { value: 2.0, label: '200%' },
                                { value: 3.0, label: '300%' }
                            ]}
                            mb="md"
                        />

                        {voice && (
                            <TextInput
                                label="Preview text"
                                value={previewText}
                                onChange={(ev) => setCustomPreviewText(ev.target.value)}
                            />
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

                {/* HeheChat Pro ad, Pro voices can be previewed for free but only saved with premium */}
                {voiceType === 'google' && !appContext.isPremium && (
                    <Alert
                        icon={<IconCrown size={16} />}
                        title={proVoiceSelected ? 'This is a HeheChat Pro voice' : 'Want a more natural voice?'}
                        color="grape"
                        variant="light"
                    >
                        <Stack gap="xs" align="flex-start">
                            <Text size="sm">
                                {proVoiceSelected
                                    ? 'Preview it as much as you like, saving it as your default needs HeheChat Pro.'
                                    : 'Voices marked Pro are available with HeheChat Pro. Preview them for free.'}
                            </Text>
                            <Button component="a" href={PREMIUM_URL} target="_blank" size="xs" color="grape" leftSection={<IconCrown size={14} />}>
                                Get HeheChat Pro
                            </Button>
                        </Stack>
                    </Alert>
                )}

                <Group justify="space-between" mt="md">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave}
                        disabled={proVoiceSelected || !voice}
                    >
                        Save Default Voice
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
