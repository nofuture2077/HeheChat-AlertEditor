import { useMemo, useRef, useState } from 'react';
import { Alert, AppShell, Badge, Button, Container, Group, List, Paper, Progress, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconCheck, IconDownload, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { HeaderLogo } from '../../src/components/HeaderLogo';
import { formatFileSize } from '../../src/components/helper';
import { EventAlertConfig, EventMainType } from '../../src/components/types';
import { ConversionPlan, planConversion } from './convert/mapping';
import { ConversionResult, FileProgress, FileStatus, runConversion } from './convert/convert';
import { SEExport } from './convert/seTypes';
import { SourcePicker } from './SourcePicker';

const alertTypes: Partial<Record<EventMainType, string>> = {
    sub: 'Subscriptions',
    subgift: 'Gift-Subs',
    subgiftb: 'Received Gift Subs',
    raid: 'Raids',
    follow: 'Follows',
    donation: 'Donations',
    cheer: 'Bit-Donations'
};

const statusColor: Record<FileStatus, string> = {
    queued: 'gray',
    downloading: 'blue',
    converting: 'orange',
    done: 'green',
    error: 'red'
};

type Phase = 'select' | 'ready' | 'converting' | 'done';

// Same thresholds as the editor's config size indicator
function sizeStatus(bytes: number) {
    const mb = bytes / (1024 * 1024);
    if (mb < 20) return { color: 'green', message: 'Recommended', icon: <IconCheck size={16} /> };
    if (mb < 50) return { color: 'blue', message: 'Okay', icon: <IconInfoCircle size={16} /> };
    if (mb < 100) return { color: 'yellow', message: 'Warning', icon: <IconAlertTriangle size={16} /> };
    return { color: 'red', message: 'Error', icon: <IconAlertTriangle size={16} /> };
}

function downloadConfig(config: EventAlertConfig) {
    const dateTime = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 16);
    const filename = `${config.meta.channel || 'alerts'}_${dateTime}.json`;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function Summary({ plan }: { plan: ConversionPlan }) {
    const counts = plan.alerts.reduce((acc, { mainType }) => {
        acc[mainType] = (acc[mainType] || 0) + 1;
        return acc;
    }, {} as Partial<Record<EventMainType, number>>);

    return (
        <Paper withBorder p="md">
            <Stack gap="sm">
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <div>
                        <Text size="sm" c="dimmed">Channel</Text>
                        <Text fw={500}>{plan.channel || '–'}</Text>
                    </div>
                    <div>
                        <Text size="sm" c="dimmed">Overlay</Text>
                        <Text fw={500}>{plan.name}</Text>
                    </div>
                </SimpleGrid>
                <Table>
                    <Table.Tbody>
                        {Object.entries(alertTypes).map(([type, label]) => (
                            <Table.Tr key={type}>
                                <Table.Td>{label}</Table.Td>
                                <Table.Td ta="right">{counts[type as EventMainType] || 0} alert{counts[type as EventMainType] === 1 ? '' : 's'}</Table.Td>
                            </Table.Tr>
                        ))}
                        <Table.Tr>
                            <Table.Td fw={500}>Media files to convert</Table.Td>
                            <Table.Td ta="right" fw={500}>{plan.media.length}</Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
                {plan.skipped.length > 0 && (
                    <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Not converted">
                        <List size="sm">
                            {plan.skipped.map(s => <List.Item key={s}>{s}</List.Item>)}
                        </List>
                    </Alert>
                )}
            </Stack>
        </Paper>
    );
}

function FileTable({ files }: { files: FileProgress[] }) {
    return (
        <Table striped>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>File</Table.Th>
                    <Table.Th w={120}>Status</Table.Th>
                    <Table.Th w={160}>Progress</Table.Th>
                    <Table.Th w={170} ta="right">Size</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {files.map(file => (
                    <Table.Tr key={file.fileId}>
                        <Table.Td>
                            <Text size="sm" truncate="end" title={file.url}>{file.name}</Text>
                            {file.message && <Text size="xs" c="red">{file.message}</Text>}
                        </Table.Td>
                        <Table.Td><Badge color={statusColor[file.status]} variant="light">{file.status}</Badge></Table.Td>
                        <Table.Td>
                            <Progress
                                value={file.progress * 100}
                                color={statusColor[file.status]}
                                animated={file.status === 'downloading' || file.status === 'converting'}
                            />
                        </Table.Td>
                        <Table.Td ta="right">
                            <Text size="sm">
                                {file.originalSize !== undefined && formatFileSize(file.originalSize)}
                                {file.finalSize !== undefined && ` → ${formatFileSize(file.finalSize)}`}
                            </Text>
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}

export default function App() {
    const [phase, setPhase] = useState<Phase>('select');
    const [plan, setPlan] = useState<ConversionPlan>();
    const [files, setFiles] = useState<FileProgress[]>([]);
    const [result, setResult] = useState<ConversionResult>();
    const [error, setError] = useState<string>();
    const abortRef = useRef<AbortController>();

    const reset = () => {
        setPhase('select');
        setPlan(undefined);
        setFiles([]);
        setResult(undefined);
        setError(undefined);
    };

    const handleExport = (seExport: SEExport) => {
        setError(undefined);
        setPlan(planConversion(seExport));
        setPhase('ready');
    };

    const startConversion = async () => {
        if (!plan) return;
        const controller = new AbortController();
        abortRef.current = controller;
        setPhase('converting');
        setError(undefined);
        try {
            const conversion = await runConversion(plan, setFiles, controller.signal);
            setResult(conversion);
            setPhase('done');
        } catch (e) {
            setError(controller.signal.aborted ? 'Conversion cancelled.' : `Conversion failed: ${(e as Error).message}`);
            setPhase('ready');
        }
    };

    const overall = useMemo(() => {
        if (!files.length) return 100;
        const done = files.reduce((sum, f) => sum + (f.status === 'done' || f.status === 'error' ? 1 : f.status === 'converting' ? 0.5 + f.progress / 2 : f.progress / 2), 0);
        return (done / files.length) * 100;
    }, [files]);

    const configSize = useMemo(() => result ? new Blob([JSON.stringify(result.config)]).size : 0, [result]);
    const size = sizeStatus(configSize);

    return (
        <AppShell header={{ height: 52 }} padding="md">
            <AppShell.Header p={10} pl={30}>
                <Group>
                    <HeaderLogo />
                    <Text fw={700} size="18px">Alert Converter</Text>
                </Group>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="md">
                    <Stack gap="lg">
                        <div>
                            <Title order={2}>StreamElements → HeheChat</Title>
                            <Text c="dimmed">
                                Converts your StreamElements alert box into a HeheChat alert config. All images, videos and sounds
                                are downloaded and converted right in your browser, nothing is uploaded.
                            </Text>
                        </div>

                        {error && (
                            <Alert color="red" icon={<IconAlertCircle size={16} />} withCloseButton onClose={() => setError(undefined)}>
                                {error}
                            </Alert>
                        )}

                        {phase === 'select' && <SourcePicker onSelect={handleExport} onError={setError} />}

                        {plan && phase !== 'select' && <Summary plan={plan} />}

                        {phase === 'ready' && (
                            <Group justify="space-between">
                                <Button variant="outline" onClick={reset}>Choose another overlay</Button>
                                <Button onClick={startConversion} disabled={!plan?.alerts.length}>Convert</Button>
                            </Group>
                        )}

                        {(phase === 'converting' || phase === 'done') && (
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text fw={500}>
                                        {phase === 'converting' ? 'Converting media…' : 'Media converted'}
                                    </Text>
                                    <Text size="sm">
                                        {files.filter(f => f.status === 'done' || f.status === 'error').length} / {files.length} files
                                    </Text>
                                </Group>
                                <Progress value={overall} size="lg" animated={phase === 'converting'} />
                                {phase === 'converting' && (
                                    <Group justify="flex-end">
                                        <Button variant="subtle" color="red" onClick={() => abortRef.current?.abort()}>Cancel</Button>
                                    </Group>
                                )}
                                <FileTable files={files} />
                            </Stack>
                        )}

                        {phase === 'done' && result && (
                            <Paper withBorder p="md">
                                <Stack gap="sm">
                                    <Group justify="space-between">
                                        <Text fw={500}>Alert config size</Text>
                                        <Group gap="xs">
                                            <Text size="sm">{formatFileSize(configSize)}</Text>
                                            <Badge color={size.color} leftSection={size.icon}>{size.message}</Badge>
                                        </Group>
                                    </Group>
                                    {configSize / (1024 * 1024) >= 50 && (
                                        <Text size="xs" c={size.color} fs="italic">
                                            {configSize / (1024 * 1024) >= 100
                                                ? 'The config exceeds the 100MB limit. Remove unused files in the editor before saving.'
                                                : 'The config exceeds the 50MB warning threshold. Consider removing unused files in the editor.'}
                                        </Text>
                                    )}
                                    {result.warnings.length > 0 && (
                                        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Warnings">
                                            <List size="sm">
                                                {result.warnings.map(w => <List.Item key={w}>{w}</List.Item>)}
                                            </List>
                                        </Alert>
                                    )}
                                    <Text size="sm" c="dimmed">
                                        TTS uses the default voice. Import the file in the HeheChat editor to adjust voices, layouts and positions.
                                    </Text>
                                    <Group justify="space-between">
                                        <Button variant="outline" leftSection={<IconRefresh size={16} />} onClick={reset}>
                                            Convert another
                                        </Button>
                                        <Button leftSection={<IconDownload size={16} />} onClick={() => downloadConfig(result.config)}>
                                            Download alert config
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
