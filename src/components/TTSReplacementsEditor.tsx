import { useState, useContext, useEffect } from 'react';
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
    
    // Use an array to maintain order and stable keys
    const [replacements, setReplacements] = useState<Array<{ id: string; key: string; value: string }>>(() => {
        const ttsReplacements = appContext.alertConfig.data?.config?.ttsReplacements || {};
        return Object.entries(ttsReplacements).map(([key, value], index) => ({
            id: `replacement-${index}-${Date.now()}`,
            key,
            value
        }));
    });

    // Update replacements when context changes or when modal is opened
    useEffect(() => {
        if (opened) {
            const ttsReplacements = appContext.alertConfig.data?.config?.ttsReplacements || {};
            setReplacements(Object.entries(ttsReplacements).map(([key, value], index) => ({
                id: `replacement-${index}-${Date.now()}`,
                key,
                value
            })));
        }
    }, [appContext.alertConfig.data?.config?.ttsReplacements, opened]);

    const handleAddReplacement = () => {
        const newReplacement = {
            id: `replacement-${Date.now()}-${Math.random()}`,
            key: `replacement_${replacements.length + 1}`,
            value: ''
        };
        setReplacements(prev => [...prev, newReplacement]);
    };

    const handleRemoveReplacement = (id: string) => {
        setReplacements(prev => prev.filter(item => item.id !== id));
    };

    const handleKeyChange = (id: string, newKey: string) => {
        // Check if new key already exists (excluding current item)
        const keyExists = replacements.some(item => item.id !== id && item.key === newKey);
        if (keyExists) {
            return; // Don't allow duplicate keys
        }

        setReplacements(prev => prev.map(item => 
            item.id === id ? { ...item, key: newKey } : item
        ));
    };

    const handleValueChange = (id: string, value: string) => {
        setReplacements(prev => prev.map(item => 
            item.id === id ? { ...item, value } : item
        ));
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

        // Convert array back to Record and filter out empty replacements
        const filteredReplacements = Object.fromEntries(
            replacements
                .filter(item => item.key.trim() !== '' && item.value.trim() !== '')
                .map(item => [item.key, item.value])
        );

        config.data.config.ttsReplacements = filteredReplacements;
        appContext.setAlertConfig(config);
        onClose();
    };

    const handleCancel = () => {
        // Reset to original state
        const ttsReplacements = appContext.alertConfig.data?.config?.ttsReplacements || {};
        setReplacements(Object.entries(ttsReplacements).map(([key, value], index) => ({
            id: `replacement-${index}-${Date.now()}`,
            key,
            value
        })));
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
                <Fieldset legend="Replacement Rules">
                    <Stack gap="sm">
                        {replacements.map((item, index) => (
                            <Group key={item.id} align="flex-end" gap="sm">
                                <TextInput
                                    label={index === 0 ? "Find (supports wildcards *)" : undefined}
                                    placeholder="Enter text to replace..."
                                    value={item.key}
                                    onChange={(e) => handleKeyChange(item.id, e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <Text size="sm" c="dimmed" style={{ padding: '0 8px', alignSelf: 'center' }}>
                                    →
                                </Text>
                                <TextInput
                                    label={index === 0 ? "Replace with" : undefined}
                                    placeholder="Enter replacement text..."
                                    value={item.value}
                                    onChange={(e) => handleValueChange(item.id, e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => handleRemoveReplacement(item.id)}
                                    style={{ alignSelf: index === 0 ? 'flex-end' : 'center' }}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Group>
                        ))}
                        
                        {replacements.length === 0 && (
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

                {replacements.length > 0 && (
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
