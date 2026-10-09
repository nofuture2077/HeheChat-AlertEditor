import { useContext, useState, useEffect, useMemo } from 'react';
import { AppShell, Group, Text, ActionIcon, Modal, Button, Tooltip } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { AlertConfigurator } from './AlertConfigurator';
import { AppContext } from '../ApplicationContext';
import { IconDeviceFloppy, IconEye, IconPackageExport, IconPackageImport, IconPlayerPlay } from '@tabler/icons-react'
import { PreviewModal } from './PreviewModal';
import { HeaderLogo } from './HeaderLogo';
import { formatFileSize } from './helper';
import { ImportConfigModal, ImportMode, mergeAlertConfigs } from './ImportConfigModal';
import { EventAlertConfig } from './types';

const AlertEditor = () => {
  const appContext = useContext(AppContext);
  const [save, setSave] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedConfigKey, setSavedConfigKey] = useState<string>('');
  const [fileSizeWarningOpened, setFileSizeWarningOpened] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(false);
  const [importOpened, setImportOpened] = useState(false);

  // The hash only covers the data, the name lives in meta and has to be compared separately
  const configKey = appContext.alertConfig.meta.hash + '|' + appContext.alertConfig.meta.name;

  // Track unsaved changes by comparing the current config with the last saved one
  useEffect(() => {
    // Initialize saved state when config is first loaded
    if (appContext.alertConfig.meta.hash && savedConfigKey === '') {
      setSavedConfigKey(configKey);
      setHasUnsavedChanges(false);
    } else if (savedConfigKey) {
      setHasUnsavedChanges(configKey !== savedConfigKey);
    }
  }, [configKey, savedConfigKey]);

  // Warning when leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Stringifying the config including all base64 files is expensive, only do it when the config changes
  const configSize = useMemo(
    () => new Blob([JSON.stringify(appContext.alertConfig)]).size,
    [appContext.alertConfig, appContext.alertConfig.meta.hash]
  );

  // Get file size status with color and message
  const getFileSizeStatus = (sizeInBytes: number) => {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB < 20) {
      return { color: 'green', message: 'Recommended', status: 'recommended' };
    } else if (sizeInMB >= 20 && sizeInMB < 50) {
      return { color: 'blue', message: 'Okay', status: 'okay' };
    } else if (sizeInMB >= 50 && sizeInMB < 100) {
      return { color: 'yellow', message: 'Warning', status: 'warning' };
    } else {
      return { color: 'red', message: 'Error', status: 'error' };
    }
  };

  const handleExport = () => {
    const config = appContext.alertConfig;
    const now = new Date();
    const dateTime = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 16);
    const filename = `${config.meta.channel}_${dateTime}.json`;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uploadConfig = () => {
    const savedKey = configKey;
    setSave(true);
    appContext.uploadAlertConfig().then(() => {
      setSavedConfigKey(savedKey);
      notifications.show({ color: 'green', title: 'Saved', message: 'Your alert config is live.' });
    }).catch((error) => {
      console.error('Saving alert config failed', error);
      notifications.show({
        color: 'red',
        title: 'Saving failed',
        message: `Your changes are not saved yet. ${error instanceof Error ? error.message : ''}`,
        autoClose: false
      });
    }).finally(() => setSave(false));
  };

  const saveConfig = () => {
    if (save) {
      return;
    }
    const sizeStatus = getFileSizeStatus(configSize);
    if (sizeStatus.status === 'error') {
      setFileSizeError(true);
    } else if (sizeStatus.status === 'warning') {
      setFileSizeWarningOpened(true);
    } else {
      uploadConfig();
    }
  };

  // Empty tag list: Ctrl/Cmd+S also saves while typing in an input
  useHotkeys([['mod+S', saveConfig]], []);

  const applyImport = (config: EventAlertConfig, mode: ImportMode) => {
    if (mode === 'override') {
      // Overriding can't be undone, keep a copy of the current config
      handleExport();
    }
    const next = mode === 'merge' ? mergeAlertConfigs(appContext.alertConfig, config) : config;
    const sizeInMB = new Blob([JSON.stringify(next)]).size / (1024 * 1024);

    if (sizeInMB >= 100) {
      setFileSizeError(true);
    } else if (sizeInMB >= 50) {
      // Set the config but also show warning
      appContext.setAlertConfig(next);
      setFileSizeWarningOpened(true);
    } else {
      appContext.setAlertConfig(next);
    }
  };

  return (
    <AppShell
      header={{ height: 52 }}
      padding="md"
    >
      <AppShell.Header p={10} pl={30}>
        <Group justify='space-between'>
          <Group justify='flex-start'>
            <HeaderLogo height={28}/>
            <Text fw={700} size="18px">Editor</Text>
          </Group>
          <Group gap="xs">
            <Tooltip label="Test an alert on your overlay">
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                onClick={() => setPreviewOpened(true)}
                aria-label="Test alert"
              ><IconPlayerPlay /></ActionIcon>
            </Tooltip>
            <Tooltip label="Open overlay preview in a new tab">
              <ActionIcon
                variant="light"
                color="blue"
                size="lg"
                onClick={() => {
                  window.open(import.meta.env.VITE_SINK_URL + "#token=" + appContext.sink + "&preview=true", '_blank');
                }}
                aria-label="Open overlay preview"
              ><IconEye /></ActionIcon>
            </Tooltip>
            <Tooltip label="Export config as file">
              <ActionIcon
                variant="light"
                color="green"
                size="lg"
                onClick={handleExport}
                aria-label="Export config"
              ><IconPackageExport /></ActionIcon>
            </Tooltip>
            <Tooltip label="Import config from file">
              <ActionIcon
                variant="light"
                color="orange"
                size="lg"
                onClick={() => setImportOpened(true)}
                aria-label="Import config"
              ><IconPackageImport /></ActionIcon>
            </Tooltip>
            {hasUnsavedChanges && !save && (
              <Text size="sm" c="dimmed" visibleFrom="sm">Unsaved changes</Text>
            )}
            <Tooltip label="Save (Ctrl+S)">
              <Button
                variant={hasUnsavedChanges ? "filled" : "light"}
                color={hasUnsavedChanges ? "pink" : "gray"}
                leftSection={<IconDeviceFloppy size={18} />}
                loading={save}
                loaderProps={{ type: 'dots' }}
                onClick={saveConfig}
              >
                Save
              </Button>
            </Tooltip>
          </Group>
          </Group>
      </AppShell.Header>

      <AppShell.Main>
        <AlertConfigurator/>
        <PreviewModal
          channel={appContext.alertConfig.meta.channel}
          opened={previewOpened}
          onClose={() => setPreviewOpened(false)}
          onSubmit={appContext.replayEvent}
          alertConfig={appContext.alertConfig}
        />
        
        <ImportConfigModal
          opened={importOpened}
          onClose={() => setImportOpened(false)}
          onImport={applyImport}
        />

        {/* File Size Warning Modal */}
        <Modal
          opened={fileSizeWarningOpened}
          onClose={() => setFileSizeWarningOpened(false)}
          title="Alert Config Size Warning"
        >
          <Text mb="md">
            Your alert configuration is larger than 50MB ({formatFileSize(configSize)}). 
            Configurations above 50MB may cause performance issues.
          </Text>
          <Text mb="md">
            Consider reducing the size by removing unused files or optimizing images.
          </Text>
          <Group justify="space-between" mt="xl">
            <Button variant="outline" onClick={() => setFileSizeWarningOpened(false)}>
              Cancel
            </Button>
            <Button 
              color="yellow"
              onClick={() => {
                setFileSizeWarningOpened(false);
                uploadConfig();
              }}
            >
              Save Anyway
            </Button>
          </Group>
        </Modal>
        
        {/* File Size Error Modal */}
        <Modal
          opened={fileSizeError}
          onClose={() => setFileSizeError(false)}
          title="Alert Config Size Error"
        >
          <Text mb="md" color="red">
            Your alert configuration is too large ({formatFileSize(configSize)}).
            The maximum allowed size is 100MB.
          </Text>
          <Text mb="md">
            Please reduce the size by removing unused files or optimizing images before saving.
          </Text>
          <Group justify="center" mt="xl">
            <Button color="red" onClick={() => setFileSizeError(false)}>
              Close
            </Button>
          </Group>
        </Modal>
      </AppShell.Main>
    </AppShell>
  );
};

export default AlertEditor;
