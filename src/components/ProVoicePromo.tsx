import { useContext, useState } from 'react';
import { Button, Group, Paper, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconCrown, IconPlayerPlay } from '@tabler/icons-react';
import { AppContext } from '../ApplicationContext';
import { getVoicePreviewText, isProVoice, LANGUAGE_NAMES, PREMIUM_URL, previewTTS } from './helper';

// Lets non-premium users try the HeheChat Pro voices, previews are free on the backend
export function ProVoicePromo() {
    const appContext = useContext(AppContext);
    const proVoices = appContext.googleVoices.filter(v => isProVoice(v.name));
    const voicesFor = (lang: string) => proVoices.filter(v => v.languageCodes.includes(lang));

    const [language, setLanguage] = useState('de-DE');
    const [voice, setVoice] = useState<string | null>(null);
    // Text typed by the user, null while the localized sample text is used
    const [customText, setCustomText] = useState<string | null>(null);

    if (appContext.isPremium || !proVoices.length) {
        return null;
    }

    const languages = Array.from(new Set(proVoices.map(v => v.languageCodes[0]))).sort();
    const selectedVoice = voice ?? voicesFor(language)[0]?.name ?? '';
    const text = customText ?? getVoicePreviewText(language);

    return (
        <Paper withBorder p="sm" mt="sm">
            <Stack gap="xs">
                <Group gap="xs">
                    <IconCrown size={18} color="var(--mantine-color-grape-6)" />
                    <Text fw={600}>Try HeheChat Pro voices</Text>
                </Group>
                <Text size="xs" c="dimmed">Natural-sounding voices for your alerts. Preview them for free.</Text>
                <Select
                    label="Language"
                    data={languages.map(lang => ({ value: lang, label: LANGUAGE_NAMES[lang] || lang }))}
                    value={language}
                    onChange={(value) => {
                        setLanguage(value || language);
                        setVoice(null);
                    }}
                />
                <Select
                    label="Voice"
                    data={voicesFor(language).map(v => ({
                        value: v.name,
                        label: `${v.name.replace(/[a-z]+-[a-zA-Z]+-/, '')} (${v.ssmlGender})`
                    }))}
                    value={selectedVoice}
                    onChange={(value) => setVoice(value)}
                />
                <TextInput
                    label="Text"
                    value={text}
                    onChange={(ev) => setCustomText(ev.target.value)}
                />
                <Group grow>
                    <Button
                        variant="light"
                        color="grape"
                        leftSection={<IconPlayerPlay size={16} />}
                        disabled={!selectedVoice || !text}
                        onClick={() => previewTTS(text, 'google', selectedVoice, appContext.alertConfig.meta.channel, appContext.sink || '', undefined, 1, 1)}
                    >
                        Listen
                    </Button>
                    <Button component="a" href={PREMIUM_URL} target="_blank" color="grape" leftSection={<IconCrown size={16} />}>
                        Get Pro
                    </Button>
                </Group>
            </Stack>
        </Paper>
    );
}
