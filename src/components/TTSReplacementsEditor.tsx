import { useState, useContext } from 'react';
import { 
    Modal, 
    Fieldset, 
    Group, 
    Button, 
    TextInput, 
    Stack, 
    ActionIcon, 
    Text, 
    Alert,
    ScrollArea,
    Divider
} from '@mantine/core';
import { IconTrash, IconPlus, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { AppContext } from '../ApplicationContext';

interface TTSReplacementsEditorProps {
    opened: boolean;
    onClose: () => void;
}

export function TTSReplacementsEditor({ opened, onClose }: TTSReplacementsEditorProps) {
    const appContext = useContext(AppContext);
    const [replacements, setReplacements] = useState<Record<string, string>>(
        appContext.alertConfig.data?.config?.ttsReplacements || {}
    );

    const handleAddReplacement = () => {
        const newKey = `replacement_${Object.keys(replacements).length + 1}`;
        setReplacements(prev => ({
            ...prev,
            [newKey]: ''
        }));
    };

    const handleRemoveReplacement = (key: string) => {
        setReplacements(prev => {
            const newReplacements = { ...prev };
            delete newReplacements[key];
            return newReplacements;
        });
    };

    const handleKeyChange = (oldKey: string, newKey: string) => {
        if (oldKey === newKey) return;
        
        // Check if new key already exists
        if (replacements[newKey] !== undefined) {
            return; // Don't allow duplicate keys
        }

        setReplacements(prev => {
            const newReplacements = { ...prev };
            newReplacements[newKey] = newReplacements[oldKey];
            delete newReplacements[oldKey];
            return newReplacements;
        });
    };

    const handleValueChange = (key: string, value: string) => {
        setReplacements(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = () => {
        const config = { ...appContext.alertConfig };
        
        // Only proceed if config.data exists (should be handled by the editor)
        if (!config.data) {
            console.error('Alert config data not initialized');
            return;
        }
        
        if (!config.data.config) {
            config.data.config = {};
        }

        // Filter out empty replacements
        const filteredReplacements = Object.fromEntries(
            Object.entries(replacements).filter(([key, value]) => key.trim() !== '' && value.trim() !== '')
        );

        config.data.config.ttsReplacements = filteredReplacements;
        appContext.setAlertConfig(config);
        onClose();
    };

    const handleCancel = () => {
        // Reset to original state
        setReplacements(appContext.alertConfig.data?.config?.ttsReplacements || {});
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleCancel}
            title="TTS Text Replacements"
            size="lg"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Stack gap="md">
                <Alert 
                    icon={<IconInfoCircle size={16} />} 
                    title="How TTS Replacements Work" 
                    color="blue"
                    variant="light"
                >
                    <Text size="sm">
                        • <strong>Word-based replacement:</strong> Only complete words are replaced, not partial matches<br/>
                        • <strong>Case-insensitive:</strong> "Hello" will match "hello", "HELLO", "Hello", etc.<br/>
                        • <strong>Wildcard support:</strong> Use * for patterns like "bad*" to match "badword", "badthing", etc.<br/>
                        • <strong>Processing order:</strong> Replacements are applied before TTS generation
                    </Text>
                </Alert>

                <Fieldset legend="Replacement Rules">
                    <Stack gap="sm">
                        {Object.entries(replacements).map(([key, value], index) => (
                            <Group key={`${key}-${index}`} align="flex-end" gap="sm">
                                <TextInput
                                    label={index === 0 ? "Find (supports wildcards *)" : undefined}
                                    placeholder="Enter text to replace..."
                                    value={key}
                                    onChange={(e) => handleKeyChange(key, e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <Text size="sm" c="dimmed" style={{ padding: '0 8px', alignSelf: 'center' }}>
                                    →
                                </Text>
                                <TextInput
                                    label={index === 0 ? "Replace with" : undefined}
                                    placeholder="Enter replacement text..."
                                    value={value}
                                    onChange={(e) => handleValueChange(key, e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => handleRemoveReplacement(key)}
                                    style={{ alignSelf: index === 0 ? 'flex-end' : 'center' }}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Group>
                        ))}
                        
                        {Object.keys(replacements).length === 0 && (
                            <Text c="dimmed" ta="center" py="xl">
                                No replacement rules configured. Click "Add Replacement" to get started.
                            </Text>
                        )}
                    </Stack>
                </Fieldset>

                <Group justify="center">
                    <Button
                        leftSection={<IconPlus size={16} />}
                        variant="light"
                        onClick={handleAddReplacement}
                    >
                        Add Replacement
                    </Button>
                </Group>

                {Object.keys(replacements).length > 0 && (
                    <>
                        <Divider />
                        <Alert 
                            icon={<IconAlertCircle size={16} />} 
                            title="Example Usage" 
                            color="green"
                            variant="light"
                        >
                            <Text size="sm">
                                <strong>Find:</strong> "bad*" → <strong>Replace with:</strong> "good"<br/>
                                <strong>Result:</strong> "badword" becomes "good", "badthing" becomes "good"<br/><br/>
                                <strong>Find:</strong> "lol" → <strong>Replace with:</strong> "laugh out loud"<br/>
                                <strong>Result:</strong> "That's so lol!" becomes "That's so laugh out loud!"
                            </Text>
                        </Alert>
                    </>
                )}

                <Group justify="space-between" mt="md">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Replacements
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
