import { useContext, ReactElement, useState, useMemo } from 'react';
import { AppContext, AppContextProps } from '../ApplicationContext';
import { ActionIcon, NavLink, ScrollArea, Space, Text, TextInput, Modal, Fieldset, Group, Button, Select, NumberInput, Textarea, Stack, SimpleGrid, MultiSelect, Checkbox, Alert, Badge, Progress } from '@mantine/core'
import { FilePreviewModal } from './FilePreviewModal';
import { useDisclosure } from '@mantine/hooks'
import { Base64File, EventAlert, EventMainType, EventTypeMapping, EventAlertRestriction } from './types'
import { IconTrash, IconPlus, IconSparkles, IconGiftFilled, IconMoneybag, IconUserHeart, IconCoinBitcoinFilled, IconMusic, IconPhoto, IconVideo, IconFile, IconPlant, IconCopy, IconAlertCircle, IconAffiliate, IconTrain, IconSettings, IconMessage, IconBoltFilled, IconRefresh } from '@tabler/icons-react';
import { DropZone } from './DropZone'
import { generateGUID, readFile, previewTTS, hashObjectSHA256, formatFileSize } from './helper';
import { IconAlertTriangle, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { TTSReplacementsEditor } from './TTSReplacementsEditor';
import { DefaultVoiceEditor } from './DefaultVoiceEditor';

export interface NavigationProps {
}

const icons: Record<EventMainType, ReactElement> = {
    'raid': <IconSparkles />,
    'sub': <IconGiftFilled />,
    'subgift': <IconGiftFilled />,
    'subgiftb': <IconGiftFilled />,
    'follow': <IconUserHeart />,
    'cheer': <IconCoinBitcoinFilled />,
    'donation': <IconMoneybag />,
    'channelPointRedemption':  <IconPlant/>,
    'kofi':  <IconAffiliate/>,
    'hypetrain':  <IconTrain/>,
    'tts': <IconMessage/>,
    'streak': <IconBoltFilled/>
}

const fileTypeIcon: Record<string, ReactElement> = {
    'audio': <IconMusic />,
    'image': <IconPhoto />,
    'video': <IconVideo />,
    'application/zip': <IconFile />
}


const alertTypes: Record<string, string> = {
    'sub': 'Subscriptions',
    'subgift': "Gift-Subs",
    "subgiftb": "Received Gift Subs",
    "raid": "Raids",
    "follow": "Follows",
    "donation": "Donations",
    "cheer": "Bit-Donations",
    "channelPointRedemption": "Channel Points",
    "kofi": "Ko-Fi Integration",
    "hypetrain": "Hypetrain",
    "tts": "Read Chat",
    "streak": "Watch Streak"
};

const AVAILABLE_CLASSES = {
    position: {
        alignment: ['align-left', 'align-center', 'align-right', 'image-bottom'],
        imageSizes: ['image-xs', 'image-sm', 'image-md', 'image-lg', 'image-xl', 'image-scale2', 'image-scale3'],
        imagePosition: ['image-fixed-bottom', 'image-fixed-left', 'image-fixed-right', 'text-over-image'],
        headlineSizes: ['headline-xs', 'headline-sm', 'headline-md', 'headline-lg', 'headline-xl', 'headline-w-xs', 'headline-w-sm', 'headline-w-md', 'headline-w-lg', 'headline-w-xl'],
        textSizes: ['text-xs', 'text-sm', 'text-md', 'text-lg', 'text-xl', 'text-w-xs', 'text-w-sm', 'text-w-md', 'text-w-lg', 'text-w-xl'],
        vertical: ['top', 'middle', 'bottom'],
        horizontal: ['left', 'center', 'right']
    },
    layout: {
        headlineFont: ['font-headline-default', 'font-headline-bangers', 'font-headline-molle', 'font-headline-fjallaone', 'font-headline-ericaone', 'font-headline-daysone', 'font-headline-pressstart2p', 'font-headline-ultra', 'headline-uppercase'],
        textFont: ['font-text-default', 'font-text-bangers', 'font-text-molle', 'font-text-fjallaone', 'font-text-ericaone', 'font-text-daysone', 'font-text-pressstart2p', 'font-text-ultra', 'text-uppercase'],
        effects: ['effect-bounce', 'effect-wave', 'effect-shake', 'effect-pulse', 'effect-glitch', 'effect-party', 
            'effect-hallucination', 'effect-psychedelic', 'effect-rainbow', 'effect-neon', 'effect-glitch-color', 'effect-disco', 'effect-trippy',
             'image-effect-bounce', 'image-effect-shake', 'image-effect-pulse', 'image-effect-wobble', 'image-effect-swing', 'image-effect-rotate', 
             'image-effect-float', 'image-effect-heartbeat', 'image-effect-jello', 'image-effect-flash', 'image-effect-party', 'image-effect-hallucination', 
             'image-effect-psychedelic', 'image-effect-rainbow', 'image-effect-neon', 'image-effect-glitch-color', 'image-effect-disco', 'image-effect-trippy',
            'fade-text-3s', 'fade-text-5s', 'fade-text-7s', 'fade-image-3s', 'fade-image-5s', 'fade-image-7s', 'fade-text-up-3s', 'fade-text-up-5s', 'fade-text-up-7s', 
            'fade-text-down-3s', 'fade-text-down-5s', 'fade-text-down-7s', 'fade-text-left-3s', 'fade-text-left-5s', 'fade-text-left-7s', 
            'fade-text-right-3s', 'fade-text-right-5s', 'fade-text-right-7s', 'fade-text-scale-3s', 'fade-text-scale-5s', 'fade-text-scale-7s', 
            'fade-text-rotate-3s', 'fade-text-rotate-5s', 'fade-text-rotate-7s', 'fade-image-up-3s', 'fade-image-up-5s', 'fade-image-up-7s', 'fade-image-down-3s', 
            'fade-image-down-5s', 'fade-image-down-7s', 'fade-image-left-3s', 'fade-image-left-5s', 'fade-image-left-7s', 'fade-image-right-3s', 'fade-image-right-5s', 
            'fade-image-right-7s', 'fade-image-scale-3s', 'fade-image-scale-5s', 'fade-image-scale-7s', 'fade-image-rotate-3s', 'fade-image-rotate-5s', 'fade-image-rotate-7s', 
            'fade-text-char-3s', 'fade-text-char-5s', 'fade-text-char-7s'],
        colors: ['yellow', 'green', 'red', 'blue', 'orange', 'pink', 'teal', 'violett', 'text-dark']
    }
  };
  

export function ConfirmDeleteView(props: {
    title: string;
    close: () => void;
    confirm: () => void;
}) {
    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false}>
            <Fieldset legend={props.title}>
                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button variant="filled" color="pink" onClick={props.confirm}>Delete</Button>
                </Group>
            </Fieldset>
        </Modal>);
}

export function CopyLayoutModal(props: {
    sourceAlert: EventAlert;
    alerts: Record<EventMainType, EventAlert[]> | { [K in EventMainType]: EventAlert[] };
    onClose: () => void;
    onCopy: (targetAlertIds: string[]) => void;
}) {
    const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
    const allAlerts = Object.values(props.alerts).flat();
    
    return (
        <Modal opened={true} onClose={props.onClose} title="Copy Layout & Position">
            <Stack>
                <Text size="sm">Select alerts to copy layout and position to:</Text>
                {allAlerts
                    .filter(alert => alert.id !== props.sourceAlert.id)
                    .map(alert => (
                        <Checkbox
                            key={alert.id}
                            label={`${alertTypes[alert.type]} - ${alert.name}`}
                            checked={selectedAlerts.includes(alert.id)}
                            onChange={(event) => {
                                if (event.currentTarget.checked) {
                                    setSelectedAlerts([...selectedAlerts, alert.id]);
                                } else {
                                    setSelectedAlerts(selectedAlerts.filter(id => id !== alert.id));
                                }
                            }}
                        />
                    ))
                }
                <Group justify="space-around" mt="md">
                    <Button onClick={props.onClose}>Cancel</Button>
                    <Button 
                        variant="filled" 
                        color="blue" 
                        onClick={() => props.onCopy(selectedAlerts)}
                        disabled={selectedAlerts.length === 0}
                    >
                        Copy to Selected
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

export function AlertView(props: {
    data?: EventAlert,
    type: EventMainType,
    fileRefs: { name: string, id: string, type: 'audio' | 'image' | 'video' | 'application/zip' }[],
    title: string;
    close: () => void;
    confirm: (date: EventAlert) => void;
}) {
    const config = useContext<AppContextProps>(AppContext);
    const [id] = useState(props.data?.id || generateGUID());
    const [name, setName] = useState(props.data?.name || "");
    const [ttsText, setTTSText] = useState(props.data?.audio?.tts?.text || "");
    const [headline, setHeadline] = useState(props.data?.visual?.headline|| "");
    const [text, setText] = useState(props.data?.visual?.text || "");
    const [layout, setLayout] = useState<string[]>((props.data?.visual?.layout || "").split(' ').filter(Boolean));
    const [position, setPosition] = useState<string[]>((props.data?.visual?.position || "").split(' ').filter(Boolean));
    const [type] = useState<EventMainType>(props.type);
    const [specType, setSpecType] = useState<'min' | 'exact' | 'mult' | 'matches'>(props.data?.specifier.type || 'min');
    const [specAmount, setSpecAmount] = useState<number>(props.data?.specifier.amount || 0);
    const [specText, setSpecText] = useState<string>(props.data?.specifier.text || '');
    const [specAttribute, setSpecAttribute] = useState<string | undefined>(props.data?.specifier.attribute || '');
    const [minDuration, setMinDuration] = useState<number>(props.data?.minDuration || 0);

    const [jingle, setJingle] = useState<{ name: string, id: string }>({ name: props.fileRefs.find(x => (x.id === props.data?.audio?.jingle) && x.id)?.name || 'id', id: (props.data?.audio?.jingle || "") });
    const [image, setImage] = useState<{ name: string, id: string }>({ name: props.fileRefs.find(x => (x.id === props.data?.visual?.element) && x.id)?.name || 'id', id: (props.data?.visual?.element || "") });
    const [voiceType, setVoiceType] = useState<'ai' | 'google' | 'none' | 'default'>(props.data?.audio?.tts?.voiceType || 'default');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const appContext = useContext<AppContextProps>(AppContext);

    const handleCopyLayout = (targetAlertIds: string[]) => {
        const layoutConfig = {
            position: position.join(' '),
            layout: layout.join(' ')
        };
        
        targetAlertIds.forEach(targetId => {
            const targetAlert = Object.values(appContext.alertConfig.data?.alerts || {})
                .flat()
                .find((alert: EventAlert) => alert.id === targetId);
            
            if (targetAlert) {
                const updatedAlert: EventAlert = {
                    ...targetAlert,
                    visual: {
                        ...targetAlert.visual,
                        headline: targetAlert.visual?.headline || '',
                        position: layoutConfig.position,
                        layout: layoutConfig.layout,
                        element: targetAlert.visual?.element
                    }
                };
                props.confirm(updatedAlert);
            }
        });
        
        setShowCopyModal(false);
        props.close();
    };
    const [voice, setVoice] = useState<string>(props.data?.audio?.tts?.voiceSpecifier || '');
    
    // Initialize selectedLanguage based on the existing voice if available
    const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
        if (props.data?.audio?.tts?.voiceType === 'google' && props.data?.audio?.tts?.voiceSpecifier) {
            // Try to find the voice in googleVoices
            const voiceData = config.googleVoices.find(v => v.name === props.data?.audio?.tts?.voiceSpecifier);
            if (voiceData && voiceData.languageCodes.length > 0) {
                return voiceData.languageCodes[0];
            }
        }
        return 'de-DE'; // Default to German
    });
    
    const nummberSpecType = specType === 'min' || specType === 'exact' || specType === 'mult';

    const InfoText = "You can use ${username}, ${usernameTo}, ${amount}, ${amount2} & ${text} variables inside the text.";
    const voiceTypes = config.aiVoices.length ? ['default', 'ai', 'google', 'none'] : ['default', 'google', 'none'];
    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false} size='xl'>
            <Stack gap="sm">
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Fieldset legend={props.title}>
                        <TextInput label="Id" value={id} readOnly disabled style={{ display: 'none' }}></TextInput>
                        <TextInput label="Name" value={name} onChange={(ev) => setName(ev.target.value)}></TextInput>
                        <Select label="Jingle" data={['none'].concat(props.fileRefs.filter(x => x.type === 'audio' || x.type === 'video').map(x => x.name || ''))} value={jingle?.name} onChange={(value) => setJingle(props.fileRefs.find(x => x.name === value) || { name: 'none', id: '' })} />
                    </Fieldset>

                    <Fieldset legend="Trigger">
                        <Stack>
                            <Select label="Type" data={['min', 'exact', 'mult', 'matches']} value={specType} onChange={(value) => setSpecType(value as 'min' | 'exact' | 'mult' | 'matches' || specType)} />
                            {nummberSpecType ? <NumberInput label="Amount" value={specAmount} onChange={(val) => setSpecAmount(Number(val))} /> : 
                            <>
                                <Select label="Attribute" value={specAttribute} data={['rewardTitle', 'username', 'type', 'eventType']} onChange={(value) => setSpecAttribute(value || undefined)} />
                                <TextInput label="Text" value={specText} onChange={(ev) => setSpecText(ev.target.value)} />
                            </>}
                        </Stack>
                    </Fieldset>

                    <Fieldset legend="Browser Overlay">
                        <Stack>
                            <Select label="Image" data={['none'].concat(props.fileRefs.filter(x => x.type === 'image' || x.type === 'video' || x.type === 'application/zip').map(x => x.name || ''))} value={image?.name} onChange={(value) => setImage(props.fileRefs.find(x => x.name === value) || { name: 'none', id: '' })} />
                            <Textarea autosize minRows={1} maxRows={3} label="Headline" value={headline} onChange={(ev) => setHeadline(ev.target.value)}></Textarea>
                            <Textarea autosize minRows={1} maxRows={3} label="Text" value={text} onChange={(ev) => setText(ev.target.value)}></Textarea>
                            <MultiSelect
                                label="Style"
                                value={layout}
                                onChange={setLayout}
                                data={[
                                    { group: 'Headline Font', items: AVAILABLE_CLASSES.layout.headlineFont.map(v => ({ value: v, label: v })) },
                                    { group: 'Text Font', items: AVAILABLE_CLASSES.layout.textFont.map(v => ({ value: v, label: v })) },
                                    { group: 'Effects', items: AVAILABLE_CLASSES.layout.effects.map(v => ({ value: v, label: v })) },
                                    { group: 'Colors', items: AVAILABLE_CLASSES.layout.colors.map(v => ({ value: v, label: v })) }
                                ]}
                            />
                            <MultiSelect
                                label="Position"
                                value={position}
                                onChange={setPosition}
                                data={[
                                    { group: 'Alignment', items: AVAILABLE_CLASSES.position.alignment.map(v => ({ value: v, label: v })) },
                                    { group: 'Image Sizes', items: AVAILABLE_CLASSES.position.imageSizes.map(v => ({ value: v, label: v })) },
                                    { group: 'Image Position', items: AVAILABLE_CLASSES.position.imagePosition.map(v => ({ value: v, label: v })) },
                                    { group: 'Headline Sizes', items: AVAILABLE_CLASSES.position.headlineSizes.map(v => ({ value: v, label: v })) },
                                    { group: 'Text Sizes', items: AVAILABLE_CLASSES.position.textSizes.map(v => ({ value: v, label: v })) },
                                    { group: 'Vertical', items: AVAILABLE_CLASSES.position.vertical.map(v => ({ value: v, label: v })) },
                                    { group: 'Horizontal', items: AVAILABLE_CLASSES.position.horizontal.map(v => ({ value: v, label: v })) }
                                ]}
                            />
                                                        <NumberInput 
                                label="Min Duration (seconds)" 
                                value={minDuration} 
                                onChange={(val) => setMinDuration(Number(val))} 
                                min={0}
                                step={0.1}
                                decimalScale={1}
                            />
                        </Stack>
                    </Fieldset>

                    <Fieldset legend="TTS">
                        <Stack>
                            <Select label="TTS System" data={voiceTypes} value={voiceType} onChange={(value) => setVoiceType(value as 'ai' | 'google' | 'none' || specType)} />
                            {voiceType === 'ai' ? (
                                <Select 
                                    label="AI Voice" 
                                    data={config.aiVoices.map((voice: {voice_id: string, name: string, category: string}) => ({
                                                value: voice.voice_id,
                                                label: voice.category + " - " + voice.name
                                            }))} 
                                    value={voice} 
                                    onChange={(value) => setVoice(value || '')} 
                                />
                            ) : voiceType === 'google' ? (
                                <>
                                    <Select
                                        label="Language"
                                        data={Array.from(new Set(config.googleVoices.map(v => v.languageCodes[0]))).sort().map(lang => {
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
                                            const voicesForLanguage = config.googleVoices.filter(v => 
                                                v.languageCodes.includes(value || 'de-DE')
                                            );
                                            if (voicesForLanguage.length > 0) {
                                                setVoice(voicesForLanguage[0].name);
                                            }
                                        }}
                                    />
                                    <Select
                                        label="Voice"
                                        data={config.googleVoices
                                            .filter(v => v.languageCodes.includes(selectedLanguage))
                                            .map(v => ({
                                                value: v.name,
                                                label: `${v.name.replace(/[a-z]+-[a-zA-Z]+-/, '')} (${v.ssmlGender})`
                                            }))}
                                        value={voice}
                                        onChange={(value) => setVoice(value || '')}
                                    />
                                </>
                            ) : null}
                            {voiceType === 'none' ? null : (
                                <>
                                    <Group align="flex-start">
                                        <Textarea 
                                            style={{ flex: 1 }}
                                            autosize 
                                            minRows={1} 
                                            maxRows={3} 
                                            label="TTS Text" 
                                            value={ttsText} 
                                            onChange={(ev) => setTTSText(ev.target.value)}
                                        />
                                        <ActionIcon 
                                            variant="filled" 
                                            color="blue" 
                                            size="lg" 
                                            mt={24}
                                            title="Preview TTS"
                                            onClick={() => previewTTS(
                                                ttsText,
                                                voiceType,
                                                voice,
                                                appContext.alertConfig.meta.channel,
                                                appContext.sink || '',
                                                appContext.alertConfig.data?.config?.defaultVoice
                                            )}
                                        >
                                            <IconMusic size={18} />
                                        </ActionIcon>
                                    </Group>
                                    <Text fs="italic">{InfoText}</Text>
                                </>
                            )}
                        </Stack>
                    </Fieldset>

                </SimpleGrid>
                {/* Premium warning for non-Standard Google voices */}
                {voiceType === 'google' && voice && !voice.includes('Standard') && !appContext.isPremium && (
                    <Alert 
                        icon={<IconAlertCircle size={16} />} 
                        title="Premium Required" 
                        color="red" 
                        variant="filled"
                        mt="md"
                    >
                        You need a premium subscription to use non-Standard Google voices. Please upgrade or select a Standard voice.
                    </Alert>
                )}
                
                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button 
                        variant="outline" 
                        color="blue" 
                        onClick={() => setShowCopyModal(true)}
                        leftSection={<IconCopy size={16} />}
                        disabled={!position.length && !layout.length}
                    >
                        Copy Layout
                    </Button>
                    <Button 
                        variant="filled" 
                        color="pink" 
                        disabled={(voiceType === 'google' && voice && !voice.includes('Standard') && !appContext.isPremium) || false}
                        onClick={() => {
                            // Create the alert object
                            const alertData = { 
                                id, 
                                name, 
                                type, 
                                specifier: { 
                                    type: specType, 
                                    amount: nummberSpecType ? specAmount : undefined, 
                                    text: nummberSpecType ? undefined : specText, 
                                    attribute: nummberSpecType ? undefined : specAttribute 
                                }, 
                                restriction: 'none' as EventAlertRestriction,
                                minDuration: minDuration > 0 ? minDuration : undefined,
                                visual: (headline || text || image?.id) ? {
                                    headline, 
                                    text, 
                                    position: position.join(' '), 
                                    layout: layout.join(' '), 
                                    element: image?.id || undefined
                                } : undefined, 
                                audio: { 
                                    jingle: jingle?.id || undefined, 
                                    tts: (ttsText && voiceType !== 'none') ? { 
                                        text: ttsText, 
                                        voiceType, 
                                        voiceSpecifier: voice, 
                                        voiceParams: {} 
                                    } : undefined 
                                } 
                            };
                            
                            props.confirm(alertData);
                        }}
                    >
                        Create Alert
                    </Button>
                </Group>
                {showCopyModal && (
                    <CopyLayoutModal
                        sourceAlert={{ id, name, type, specifier: { type: specType }, restriction: 'none' as EventAlertRestriction }}
                        alerts={appContext.alertConfig.data?.alerts || {
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
                        }}
                        onClose={() => setShowCopyModal(false)}
                        onCopy={handleCopyLayout}
                    />
                )}
            </Stack>
        </Modal>);
}


export function UploadFileView(props: {
    title: string;
    close: () => void;
    confirm: (date: Base64File) => void;
}) {
    const [id] = useState(generateGUID());
    const [name, setName] = useState("");
    const [mime, setMime] = useState("");
    const [data, setData] = useState("");
    const [type, setType] = useState<'audio' | 'image' | 'video' | 'application/zip'>('audio');
    const [fileSize, setFileSize] = useState<number>(0);
    const [fileSizeWarning, setFileSizeWarning] = useState<boolean>(false);
    const [fileSizeError, setFileSizeError] = useState<boolean>(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const appContext = useContext<AppContextProps>(AppContext);

    // Calculate current config size
    const calculateCurrentConfigSize = () => {
        const configString = JSON.stringify(appContext.alertConfig);
        return new Blob([configString]).size;
    };

    // Calculate the estimated new config size after adding this file
    const calculateEstimatedNewSize = () => {
        return calculateCurrentConfigSize() + fileSize;
    };

    // Check if filename is unique
    const isFilenameUnique = (filename: string): boolean => {
        return !Object.values(appContext.alertConfig.data?.files || {}).some(
            file => file.name === filename
        );
    };

    // Generate a unique filename by adding a suffix
    const generateUniqueFilename = (originalName: string): string => {
        // If name is already unique, return it
        if (isFilenameUnique(originalName)) {
            return originalName;
        }

        // Split filename into name and extension
        const lastDotIndex = originalName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';
        
        // Try adding numbers until we find a unique name
        let counter = 1;
        let newName = `${baseName}_${counter}${extension}`;
        
        while (!isFilenameUnique(newName)) {
            counter++;
            newName = `${baseName}_${counter}${extension}`;
        }
        
        return newName;
    };

    // Validate filename when it changes
    const validateFilename = (filename: string) => {
        if (!filename) {
            setNameError("Filename cannot be empty");
            return false;
        }
        
        if (!isFilenameUnique(filename)) {
            setNameError("Filename must be unique. Please choose a different name.");
            return false;
        }
        
        setNameError(null);
        return true;
    };

    const onSelect = function (file: File) {
        // Check file size - individual files over 20MB will trigger a warning
        const fileSizeMB = file.size / (1024 * 1024);
        setFileSize(file.size);
        
        // Check if adding this file would push the config over limits
        const currentSizeMB = calculateCurrentConfigSize() / (1024 * 1024);
        const estimatedNewSizeMB = currentSizeMB + fileSizeMB;
        
        if (estimatedNewSizeMB >= 100) {
            setFileSizeError(true);
            return;
        } else if (fileSizeMB >= 20 || estimatedNewSizeMB >= 50) {
            setFileSizeWarning(true);
        }
        
        // Generate a unique filename
        const uniqueFilename = generateUniqueFilename(file.name);
        setName(uniqueFilename);
        setMime(file.type);
        if (file.type.startsWith('audio')) {
            setType('audio');
        } else if (file.type.startsWith('video')) {
            setType('video');
        } else if (file.type === 'application/zip') {
            setType('application/zip');
        } else {
            setType('image');
        }
        readFile(file).then((data: string) => {
            setData(data.split(',')[1]);
        });
    }
    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false}>
            <Fieldset legend={props.title}>
                <DropZone onSelect={onSelect}></DropZone>
                <TextInput label="Id" value={id} readOnly disabled></TextInput>
                <TextInput label="Type" value={mime} readOnly disabled></TextInput>
                <TextInput 
                    label="Name" 
                    value={name} 
                    onChange={(ev) => {
                        setName(ev.target.value);
                        validateFilename(ev.target.value);
                    }}
                    error={nameError}
                    required
                ></TextInput>
                
                {fileSize > 0 && (
                    <Group mt="xs">
                        <Text size="sm">File size: {formatFileSize(fileSize)}</Text>
                        {fileSizeWarning && !fileSizeError && (
                            <Badge color="yellow">Large file</Badge>
                        )}
                    </Group>
                )}
                
                {fileSizeWarning && !fileSizeError && (
                    <Alert 
                        color="yellow" 
                        title="Large File Warning" 
                        icon={<IconAlertTriangle size={16} />}
                        mt="sm"
                    >
                        This file is large ({formatFileSize(fileSize)}). Adding it will make your config approximately {formatFileSize(calculateEstimatedNewSize())}.
                        {calculateEstimatedNewSize() / (1024 * 1024) >= 50 && (
                            <Text mt="xs">This will exceed the 50MB warning threshold.</Text>
                        )}
                    </Alert>
                )}
                
                {fileSizeError && (
                    <Alert 
                        color="red" 
                        title="File Too Large" 
                        icon={<IconAlertTriangle size={16} />}
                        mt="sm"
                    >
                        Adding this file would make your config exceed the 100MB limit. Please use a smaller file or optimize this one.
                    </Alert>
                )}
                
                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button 
                        variant="filled" 
                        color="pink" 
                        onClick={() => props.confirm({ id, name, mime, type, data })}
                        disabled={fileSizeError || !data || !!nameError || !name}
                    >
                        Upload
                    </Button>
                </Group>
            </Fieldset>
        </Modal>);
}


export function ReplaceFileView(props: {
    title: string;
    existingFile: Base64File;
    close: () => void;
    confirm: (date: Base64File) => void;
}) {
    // Keep the same id as the existing file: every alert that references this
    // file by id (audio.jingle / visual.element) keeps working with no
    // additional reference-rewriting needed.
    const id = props.existingFile.id;
    const [name, setName] = useState(props.existingFile.name);
    const [mime, setMime] = useState("");
    const [data, setData] = useState("");
    const [type, setType] = useState<'audio' | 'image' | 'video' | 'application/zip'>(props.existingFile.type);
    const [fileSize, setFileSize] = useState<number>(0);
    const [fileSizeWarning, setFileSizeWarning] = useState<boolean>(false);
    const [fileSizeError, setFileSizeError] = useState<boolean>(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const appContext = useContext<AppContextProps>(AppContext);

    // Calculate current config size
    const calculateCurrentConfigSize = () => {
        const configString = JSON.stringify(appContext.alertConfig);
        return new Blob([configString]).size;
    };

    // The old file's bytes are being removed and the new file's bytes added
    const getOldFileSize = () => {
        return props.existingFile.data ? Math.round(props.existingFile.data.length * 0.75) : 0;
    };

    // Calculate the estimated new config size after replacing this file
    const calculateEstimatedNewSize = () => {
        return calculateCurrentConfigSize() - getOldFileSize() + fileSize;
    };

    // Check if filename is unique (excluding the file being replaced)
    const isFilenameUnique = (filename: string): boolean => {
        return !Object.values(appContext.alertConfig.data?.files || {}).some(
            file => file.id !== id && file.name === filename
        );
    };

    // Validate filename when it changes
    const validateFilename = (filename: string) => {
        if (!filename) {
            setNameError("Filename cannot be empty");
            return false;
        }

        if (!isFilenameUnique(filename)) {
            setNameError("Filename must be unique. Please choose a different name.");
            return false;
        }

        setNameError(null);
        return true;
    };

    const onSelect = function (file: File) {
        // Check file size - individual files over 20MB will trigger a warning
        const fileSizeMB = file.size / (1024 * 1024);
        setFileSize(file.size);

        // Check if replacing with this file would push the config over limits
        const oldFileSizeMB = getOldFileSize() / (1024 * 1024);
        const currentSizeMB = calculateCurrentConfigSize() / (1024 * 1024);
        const estimatedNewSizeMB = currentSizeMB - oldFileSizeMB + fileSizeMB;

        if (estimatedNewSizeMB >= 100) {
            setFileSizeError(true);
            return;
        } else {
            setFileSizeError(false);
            if (fileSizeMB >= 20 || estimatedNewSizeMB >= 50) {
                setFileSizeWarning(true);
            } else {
                setFileSizeWarning(false);
            }
        }

        setMime(file.type);
        if (file.type.startsWith('audio')) {
            setType('audio');
        } else if (file.type.startsWith('video')) {
            setType('video');
        } else if (file.type === 'application/zip') {
            setType('application/zip');
        } else {
            setType('image');
        }
        readFile(file).then((data: string) => {
            setData(data.split(',')[1]);
        });
    }

    return (
        <Modal key="replace-file-view" opened={true} onClose={props.close} withCloseButton={false}>
            <Fieldset legend={props.title}>
                <Text size="sm" mb="xs" c="dimmed">
                    Replacing "{props.existingFile.name}" — every alert currently using this file will automatically use the new content.
                </Text>
                <DropZone onSelect={onSelect}></DropZone>
                <TextInput label="Id" value={id} readOnly disabled style={{ display: 'none' }}></TextInput>
                <TextInput label="Type" value={mime || props.existingFile.mime} readOnly disabled></TextInput>
                <TextInput
                    label="Name"
                    value={name}
                    onChange={(ev) => {
                        setName(ev.target.value);
                        validateFilename(ev.target.value);
                    }}
                    error={nameError}
                    required
                ></TextInput>

                {fileSize > 0 && (
                    <Group mt="xs">
                        <Text size="sm">New file size: {formatFileSize(fileSize)}</Text>
                        {fileSizeWarning && !fileSizeError && (
                            <Badge color="yellow">Large file</Badge>
                        )}
                    </Group>
                )}

                {fileSizeWarning && !fileSizeError && (
                    <Alert
                        color="yellow"
                        title="Large File Warning"
                        icon={<IconAlertTriangle size={16} />}
                        mt="sm"
                    >
                        This file is large ({formatFileSize(fileSize)}). After replacing, your config will be approximately {formatFileSize(calculateEstimatedNewSize())}.
                        {calculateEstimatedNewSize() / (1024 * 1024) >= 50 && (
                            <Text mt="xs">This will exceed the 50MB warning threshold.</Text>
                        )}
                    </Alert>
                )}

                {fileSizeError && (
                    <Alert
                        color="red"
                        title="File Too Large"
                        icon={<IconAlertTriangle size={16} />}
                        mt="sm"
                    >
                        Replacing with this file would make your config exceed the 100MB limit. Please use a smaller file or optimize this one.
                    </Alert>
                )}

                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button
                        variant="filled"
                        color="pink"
                        onClick={() => props.confirm({ id, name, mime: mime || props.existingFile.mime, type, data })}
                        disabled={fileSizeError || !data || !!nameError || !name}
                    >
                        Replace
                    </Button>
                </Group>
            </Fieldset>
        </Modal>);
}


export function AlertConfigurator(props: NavigationProps) {
    const appContext = useContext<AppContextProps>(AppContext);
    const [confirmDeleteOpen, confirmDeleteHandler] = useDisclosure(false);
    const [confirmDeleteComponent, setConfirmDeleteComponent] = useState<ReactElement | undefined>(undefined);
    const [ttsReplacementsOpened, setTtsReplacementsOpened] = useState(false);
    const [defaultVoiceOpened, setDefaultVoiceOpened] = useState(false);

    // Ensure config structure is initialized
    const ensureConfigStructure = async () => {
        const config = { ...appContext.alertConfig };
        
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

        if (config.data.alerts) {
            config.data.alerts.kofi ||= [];
            config.data.alerts.hypetrain ||= [];
            config.data.alerts.streak ||= [];
            config.data.alerts.tts ||= [{
                name: 'Read Chat',
                id: generateGUID(),
                type: 'tts',
                specifier: {
                    type: 'min',
                    amount: 0
                },
                restriction: 'none',
                audio: {
                    tts: {
                        voiceType: 'default',
                        voiceSpecifier: '',
                        voiceParams: {},
                        text: '${username}: ${text}'
                    }
                }
            }];

            config.meta.hash = await(hashObjectSHA256(config.data))
        }
        
        if (!config.data.config) {
            config.data.config = {};
        }
        
        if (!config.data.config.ttsReplacements) {
            config.data.config.ttsReplacements = {};
        }
        
        appContext.setAlertConfig(config);
    };

    const setName = async function (name: string) {
        await ensureConfigStructure();
        appContext.alertConfig.meta.name = name;
        appContext.setAlertConfig(appContext.alertConfig);
    }

    const deleteFile = function (fileId: string) {
        const config = appContext.alertConfig;
        delete config.data?.files[fileId];
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const addAlert = function (data: EventAlert) {
        const config = appContext.alertConfig;
        const array = config.data!.alerts[EventTypeMapping[data.type]];
        const index = array.findIndex((obj: EventAlert) => obj.id === data.id);

        if (index !== -1) {
            array[index] = data;
        } else {
            array.push(data);
        }

        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const addFile = function (data: Base64File) {
        const config = appContext.alertConfig;
        config.data!.files[data.id] = data;
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    // Replace a file's content/name while keeping its id, so every alert
    // reference (audio.jingle / visual.element) stays valid automatically.
    const replaceFile = function (data: Base64File) {
        const config = appContext.alertConfig;
        config.data!.files[data.id] = data;
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const deleteAlert = function (alertId: string) {
        const config = appContext.alertConfig;
        Object.keys(config.data!.alerts).forEach((evType) => {
            config.data!.alerts[evType as EventMainType] = config.data!.alerts[evType as EventMainType].filter((x: EventAlert) => x.id !== alertId);
        });
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    function confirmDeleteAlert(title: string, confirm: () => void) {
        setConfirmDeleteComponent(<ConfirmDeleteView title={title} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    function addAlertView(type: EventMainType, title: string, confirm: (data: EventAlert) => void, data?: EventAlert) {
        setConfirmDeleteComponent(<AlertView fileRefs={Object.values(appContext.alertConfig.data?.files || {}).map(x => ({ name: x.name, id: x.id, type: x.type }))} type={type} title={title} data={data} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    function uploadFileView(title: string, confirm: (data: Base64File) => void) {
        setConfirmDeleteComponent(<UploadFileView title={title} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    function replaceFileView(existingFile: Base64File, confirm: (data: Base64File) => void) {
        setConfirmDeleteComponent(<ReplaceFileView title={'Replace File: ' + existingFile.name} existingFile={existingFile} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    const cloneAlert = function(alert: EventAlert) {
        const clonedAlert = {
            ...alert,
            id: generateGUID(),
            name: alert.name + " Copy"
        };
        addAlertView(alert.type as EventMainType, 'Edit Alert: ' + clonedAlert.name, addAlert, clonedAlert);
    };

    const formatDescription = function(alert: EventAlert) {
        let suffix = '';
        switch (alert.type) {
            case 'raid': suffix = ' Viewers';break;
            case 'cheer': suffix = ' Bits';break;
            case 'sub': suffix = ' Months';break;
            case 'subgift': suffix = ' Subs';break;
            case 'subgiftb': suffix = ' Subs';break;
            case 'hypetrain': suffix = ' Level';break;
            case 'streak': suffix = ' Streams';break;
        }
        switch (alert.specifier.type) {
            case 'min': return alert.specifier.amount + "+" + suffix;
            case 'exact': return alert.specifier.amount + suffix;
            case 'mult': return alert.specifier.amount + suffix;
            case 'matches': return alert.specifier.attribute +  ": " + alert.specifier.text;
        }
    }

    const alertNodes = <>{Object.keys(alertTypes).map((ev) => {
        return <NavLink label={alertTypes[ev]} key={ev} leftSection={icons[ev as EventMainType]}>
            {(appContext.alertConfig.data!.alerts[ev as EventMainType] || []).map((alert: EventAlert) => (
              <NavLink 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addAlertView(ev as EventMainType, 'Edit Alert: ' + alert.name, addAlert, alert);
                }}
                description={formatDescription(alert)}
                leftSection={
                  <ActionIcon variant='transparent'>
                    {icons[ev as EventMainType]}
                  </ActionIcon>
                } 
                rightSection={
                  <Group gap={0}>
                    <ActionIcon variant='subtle' onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cloneAlert(alert);
                    }}>
                      <IconPlus />
                    </ActionIcon>
                    <ActionIcon variant='subtle' onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirmDeleteAlert("Are you sure to delete Alert: \"" + alert.name + "\"?", () => deleteAlert(alert.id));
                    }}>
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                } 
                key={alert.id} 
                label={alert.name} 
              />
            ))}
            <NavLink leftSection={<IconPlus />} label="Add New" key={ev + "-new"} onClick={() => addAlertView(ev as EventMainType, 'Add Alert: ' + alertTypes[ev], addAlert)}></NavLink>
        </NavLink>
    })}</>;

    const [previewFile, setPreviewFile] = useState<Base64File | null>(null);
    const [previewOpened, setPreviewOpened] = useState(false);

    const handlePreviewClose = () => {
        setPreviewOpened(false);
        setPreviewFile(null);
    };

    const handleFileRename = (id: string, newName: string) => {
        const config = appContext.alertConfig;
        if (config.data?.files[id]) {
            // Check if any other file already has this name
            const nameExists = Object.values(config.data.files).some(
                file => file.id !== id && file.name === newName
            );
            
            if (nameExists) {
                // If name exists, don't update and return false to indicate failure
                return false;
            }
            
            config.data.files[id].name = newName;
            appContext.setAlertConfig(config);
            return true;
        }
        return false;
    };

    const handlePreviewOpen = (file: Base64File) => {
        setPreviewFile(file);
        setPreviewOpened(true);
    };

    // Calculate file size from Base64 data
    const getFileSize = (base64Data: string): number => {
        // Base64 string length * 0.75 gives approximate byte size
        return base64Data ? Math.round(base64Data.length * 0.75) : 0;
    };

    // Count how many alerts use each file
    const countFileUsage = (fileId: string): number => {
        let count = 0;
        const alerts = appContext.alertConfig.data?.alerts || {};
        
        Object.values(alerts).forEach((alertArray) => {
            (alertArray as EventAlert[]).forEach((alert: EventAlert) => {
                // Check if file is used as jingle
                if (alert.audio?.jingle === fileId) {
                    count++;
                }
                // Check if file is used as visual element
                if (alert.visual?.element === fileId) {
                    count++;
                }
            });
        });
        
        return count;
    };

    const fileNodes = <>{Object.values(appContext.alertConfig.data?.files || {}).map((file) => {
        const fileSize = getFileSize(file.data);
        const usageCount = countFileUsage(file.id);
        
        return <NavLink 
            leftSection={
                <ActionIcon variant='transparent'>
                    {fileTypeIcon[file.type]}
                </ActionIcon>
            } 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePreviewOpen(file);
            }}
            rightSection={
                <Group gap={0}>
                    <ActionIcon variant='subtle' onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        replaceFileView(file, replaceFile);
                    }} title="Replace File">
                        <IconRefresh />
                    </ActionIcon>
                    <ActionIcon variant='subtle' onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirmDeleteAlert("Are you sure to delete File: \"" + file.name + "\"?", () => deleteFile(file.id));
                    }}>
                        <IconTrash />
                    </ActionIcon>
                </Group>
            } 
            key={file.id} 
            label={file.name}
            description={`${formatFileSize(fileSize)} • Used in ${usageCount} alert${usageCount !== 1 ? 's' : ''}`}
        />
    })}</>;

    return <ScrollArea>
        <FilePreviewModal
            opened={previewOpened}
            onClose={handlePreviewClose}
            onRename={handleFileRename}
            file={previewFile}
        />
        <TTSReplacementsEditor
            opened={ttsReplacementsOpened}
            onClose={() => setTtsReplacementsOpened(false)}
        />
        <DefaultVoiceEditor
            opened={defaultVoiceOpened}
            onClose={() => setDefaultVoiceOpened(false)}
        />
        {confirmDeleteOpen ? confirmDeleteComponent : null}
        <Text>Meta-Information</Text>
        <TextInput label="Channel" value={appContext.alertConfig.meta.channel} readOnly disabled />
        <TextInput label="Name" value={appContext.alertConfig.meta.name} onChange={async (ev) => await setName(ev.target.value)} />
        <TextInput label="GUID" value={appContext.alertConfig.meta.guid} readOnly disabled />
        <TextInput label="Hash" value={appContext.alertConfig.meta.hash} readOnly disabled />
        <TextInput label="Last Update" value={appContext.alertConfig.meta.lastUpdate} readOnly disabled />
        
        {/* File Size Indicator */}
        {(() => {
            const calculateConfigSize = () => {
                const configString = JSON.stringify(appContext.alertConfig);
                return new Blob([configString]).size;
            };
            
            const configSize = calculateConfigSize();
            const sizeInMB = configSize / (1024 * 1024);
            
            let color, message, icon;
            
            if (sizeInMB < 20) {
                color = 'green';
                message = 'Recommended';
                icon = <IconCheck size={16} />;
            } else if (sizeInMB >= 20 && sizeInMB < 50) {
                color = 'blue';
                message = 'Okay';
                icon = <IconInfoCircle size={16} />;
            } else if (sizeInMB >= 50 && sizeInMB < 100) {
                color = 'yellow';
                message = 'Warning';
                icon = <IconAlertTriangle size={16} />;
            } else {
                color = 'red';
                message = 'Error';
                icon = <IconAlertTriangle size={16} />;
            }
            
            // Calculate percentage for progress bar (100% = 100MB)
            const percentage = Math.min(sizeInMB, 100);
            
            return (
                <Stack gap="xs" mt="md">
                    <Group justify="space-between">
                        <Text size="sm" fw={500}>Alert Config Size</Text>
                        <Group gap="xs">
                            <Text size="sm">{formatFileSize(configSize)}</Text>
                            <Badge color={color} leftSection={icon}>
                                {message}
                            </Badge>
                        </Group>
                    </Group>
                    <Progress 
                        value={percentage} 
                        color={color}
                        size="sm"
                    />
                    {sizeInMB >= 50 && (
                        <Text size="xs" color={color} fs="italic">
                            {sizeInMB >= 100 
                                ? "Size exceeds 100MB limit. You won't be able to save until you reduce the size."
                                : "Size exceeds 50MB warning threshold. Consider optimizing your files."}
                        </Text>
                    )}
                </Stack>
            );
        })()}
        <Space h="xl" />
        <Text>TTS Configuration</Text>
        <NavLink 
            label="TTS Text Replacements" 
            leftSection={<IconSettings />}
            onClick={async () => {
                await ensureConfigStructure();
                setTtsReplacementsOpened(true);
            }}
            description={`${Object.keys(appContext.alertConfig.data?.config?.ttsReplacements || {}).length} replacement rules configured`}
        />
        <NavLink 
            label="Default Voice" 
            leftSection={<IconMusic />}
            onClick={async () => {
                await ensureConfigStructure();
                setDefaultVoiceOpened(true);
            }}
            description={
                appContext.alertConfig.data?.config?.defaultVoice 
                    ? `${appContext.alertConfig.data.config.defaultVoice.voiceType.toUpperCase()}: ${
                        appContext.alertConfig.data.config.defaultVoice.voiceType === 'ai'
                            ? appContext.aiVoices.find(v => v.voice_id === appContext.alertConfig.data?.config?.defaultVoice?.voiceSpecifier)?.name || appContext.alertConfig.data.config.defaultVoice.voiceSpecifier
                            : appContext.alertConfig.data.config.defaultVoice.voiceSpecifier
                      }`
                    : "No default voice configured"
            }
        />
        <Space h="xl" />
        <Text>Alerts</Text>
        {alertNodes}
        <Space h="xl" />
        <NavLink label={"Files"} key={"files"} leftSection={<IconFile />} defaultOpened>
            {fileNodes}
        </NavLink>
        <NavLink leftSection={<IconPlus />} label="Add New" key={"file-new"} onClick={() => uploadFileView('Upload File', addFile)}></NavLink>

    </ScrollArea>
}
