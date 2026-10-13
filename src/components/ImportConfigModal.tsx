import { useState } from 'react';
import { Alert, Button, Group, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { DropZone } from './DropZone';
import { generateGUID } from './helper';
import { Base64File, Base64FileReference, EventAlert, EventAlertConfig, EventMainType } from './types';

export type ImportMode = 'override' | 'merge';

const MAX_IMPORT_SIZE = 100 * 1024 * 1024; // 100MB

export function mergeAlertConfigs(current: EventAlertConfig, imported: EventAlertConfig): EventAlertConfig {
  const alerts = { ...current.data?.alerts } as Record<EventMainType, EventAlert[]>;
  const files: Record<Base64FileReference, Base64File> = { ...current.data?.files };
  const importedFiles = imported.data?.files || {};

  const existingIds = new Set<string>();
  Object.values(alerts).forEach((list) => (list || []).forEach((alert) => existingIds.add(alert.id)));

  Object.entries(imported.data?.alerts || {}).forEach(([type, importedAlerts]) => {
    const merged = (importedAlerts || []).map((alert) => {
      const id = existingIds.has(alert.id) ? generateGUID() : alert.id;
      existingIds.add(id);

      [alert.audio?.jingle, alert.visual?.element].forEach((ref) => {
        if (ref && importedFiles[ref]) {
          files[ref] = importedFiles[ref];
        }
      });

      return { ...alert, id };
    });
    alerts[type as EventMainType] = [...(alerts[type as EventMainType] || []), ...merged];
  });

  return {
    ...current,
    data: {
      ...current.data,
      alerts,
      files,
    },
  };
}

export function ImportConfigModal(props: {
  opened: boolean;
  onClose: () => void;
  onImport: (config: EventAlertConfig, mode: ImportMode) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('override');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setFile(null);
    setMode('override');
    setError(null);
    props.onClose();
  };

  const handleImport = async () => {
    if (!file) {
      return;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      setError('The file is too large. The maximum allowed size is 100MB.');
      return;
    }
    try {
      const config = JSON.parse(await file.text()) as EventAlertConfig;
      if (!config || typeof config !== 'object' || !config.data?.alerts) {
        setError('The file is not a valid alert config.');
        return;
      }
      props.onImport(config, mode);
      close();
    } catch (e) {
      console.error('Failed to parse config file:', e);
      setError('Failed to read the file. Please make sure it is a valid JSON alert config.');
    }
  };

  return (
    <Modal opened={props.opened} onClose={close} title="Import Alert Config">
      <Stack>
        <DropZone
          accept={['application/json']}
          onSelect={(f) => {
            setFile(f);
            setError(null);
          }}
        />
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(value) => setMode(value as ImportMode)}
          data={[
            { label: 'Override', value: 'override' },
            { label: 'Merge', value: 'merge' },
          ]}
        />
        {mode === 'override' ? (
          <Alert color="yellow" icon={<IconAlertTriangle />} title="Replaces your current config">
            All current alerts and files are replaced. A backup of your current config is downloaded first.
          </Alert>
        ) : (
          <Text size="sm" c="dimmed">
            Adds the alerts (and their files) from the uploaded config to your current config.
          </Text>
        )}
        {error && (
          <Alert color="red" icon={<IconAlertCircle />}>
            {error}
          </Alert>
        )}
        <Group justify="space-between" mt="md">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!file} color={mode === 'override' ? 'red' : undefined} onClick={handleImport}>
            {mode === 'override' ? 'Replace Config' : 'Import'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
