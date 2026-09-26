import { useState } from 'react';
import { Alert, Button, Checkbox, Group, Image, List, PasswordInput, rem, Stack, Tabs, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconFileImport, IconInfoCircle, IconPlugConnected, IconX } from '@tabler/icons-react';
import { loadAlertOverlays, SEOverlay } from './convert/seApi';
import { isSEExport, SEExport } from './convert/seTypes';

type Props = {
    onSelect: (exports: SEExport[]) => void;
    onError: (message: string) => void;
};

function ConnectPanel({ onSelect, onError }: Props) {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number }>();
    const [overlays, setOverlays] = useState<SEOverlay[]>();
    const [selected, setSelected] = useState<string[]>([]);

    const load = async () => {
        setLoading(true);
        setOverlays(undefined);
        setSelected([]);
        try {
            const found = await loadAlertOverlays(token, (done, total) => setProgress({ done, total }));
            setOverlays(found);
            if (found.length === 1) {
                onSelect([found[0].export]);
            }
        } catch (e) {
            onError((e as Error).message);
        } finally {
            setLoading(false);
            setProgress(undefined);
        }
    };

    return (
        <Stack gap="sm">
            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                <List size="sm" type="ordered">
                    <List.Item>Open your StreamElements dashboard → profile → <b>Account settings</b> → <b>Channels</b>.</List.Item>
                    <List.Item>Click <b>Show secrets</b> and copy the <b>JWT Token</b>.</List.Item>
                </List>
                <Text size="xs" mt="xs" c="dimmed">
                    The token stays in your browser, is only sent to api.streamelements.com and is not stored.
                    It grants full access to your StreamElements account, never share it with anyone.
                </Text>
            </Alert>
            <PasswordInput
                label="StreamElements JWT Token"
                placeholder="eyJhbGciOi…"
                value={token}
                onChange={(ev) => setToken(ev.currentTarget.value)}
                onKeyDown={(ev) => ev.key === 'Enter' && token && load()}
            />
            <Group justify="flex-end">
                <Button onClick={load} loading={loading} disabled={!token.trim()} leftSection={<IconPlugConnected size={16} />}>
                    Load overlays
                </Button>
            </Group>
            {loading && progress && progress.total > 0 && (
                <Text size="sm" c="dimmed">Checking overlays {progress.done} / {progress.total}…</Text>
            )}

            {overlays && overlays.length === 0 && (
                <Alert color="yellow">None of your overlays contains an Alert Box widget.</Alert>
            )}

            {overlays && overlays.length > 1 && (
                <Stack gap="xs">
                    <Text fw={500}>Several overlays contain alert boxes, pick the ones you use:</Text>
                    <Checkbox.Group value={selected} onChange={setSelected}>
                        <Stack gap="xs">
                            {overlays.map(overlay => (
                                <Checkbox.Card key={overlay.id} value={overlay.id} p="sm" radius="md">
                                    <Group wrap="nowrap">
                                        <Checkbox.Indicator />
                                        {overlay.preview && <Image src={overlay.preview} w={96} h={54} radius="sm" fit="cover" />}
                                        <div>
                                            <Text fw={500}>{overlay.name}</Text>
                                            <Text size="xs" c="dimmed">
                                                {overlay.alertBoxes} alert box{overlay.alertBoxes !== 1 ? 'es' : ''}
                                                {overlay.updatedAt && ` • last changed ${new Date(overlay.updatedAt).toLocaleDateString()}`}
                                            </Text>
                                        </div>
                                    </Group>
                                </Checkbox.Card>
                            ))}
                        </Stack>
                    </Checkbox.Group>
                    <Group justify="flex-end">
                        <Button
                            disabled={!selected.length}
                            onClick={() => onSelect(overlays.filter(o => selected.includes(o.id)).map(o => o.export))}
                        >
                            {selected.length > 1 ? `Use ${selected.length} overlays` : 'Use this overlay'}
                        </Button>
                    </Group>
                </Stack>
            )}
        </Stack>
    );
}

function UploadPanel({ onSelect, onError }: Props) {
    const handleFiles = async (files: File[]) => {
        const exports: SEExport[] = [];
        const errors: string[] = [];
        for (const file of files) {
            try {
                const json = JSON.parse(await file.text());
                if (isSEExport(json)) {
                    exports.push(json);
                } else {
                    errors.push(`${file.name} does not look like a StreamElements overlay export: no Alert Box widget found.`);
                }
            } catch (e) {
                errors.push(`Could not read ${file.name}: ${(e as Error).message}`);
            }
        }
        if (exports.length) onSelect(exports);
        if (errors.length) onError(errors.join(' '));
    };

    return (
        <Dropzone
            onDrop={(dropped) => dropped.length && handleFiles(dropped)}
            accept={['application/json']}
            multiple
        >
            <Group justify="center" gap="xl" mih={200} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                    <IconFileImport style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                    <IconX style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                    <IconFileImport style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }} />
                </Dropzone.Idle>
                <div>
                    <Text size="xl" inline>Drop your StreamElements overlay JSON files here</Text>
                    <Text size="sm" c="dimmed" inline mt={7} display="block">
                        The overlay bootstrap response from the StreamElements API, or click to select one or more files
                    </Text>
                </div>
            </Group>
        </Dropzone>
    );
}

export function SourcePicker(props: Props) {
    return (
        <Tabs defaultValue="connect" keepMounted={false}>
            <Tabs.List mb="md">
                <Tabs.Tab value="connect" leftSection={<IconPlugConnected size={16} />}>Connect StreamElements</Tabs.Tab>
                <Tabs.Tab value="upload" leftSection={<IconFileImport size={16} />}>Upload JSON</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="connect"><ConnectPanel {...props} /></Tabs.Panel>
            <Tabs.Panel value="upload"><UploadPanel {...props} /></Tabs.Panel>
        </Tabs>
    );
}
