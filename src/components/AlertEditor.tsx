import { useContext, useState, useEffect } from 'react';
import { AppShell, Image, Group, Text, ActionIcon } from '@mantine/core';
import { AlertConfigurator } from './AlertConfigurator';
import { AppContext } from '../ApplicationContext';
import { IconDeviceFloppy, IconEye, IconPackageExport, IconPackageImport, IconPlayerPlay } from '@tabler/icons-react'
import { PreviewModal } from './PreviewModal';
import { HeaderLogo } from './HeaderLogo';

const AlertEditor = () => {
  const appContext = useContext(AppContext);
  const [save, setSave] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedConfigHash, setSavedConfigHash] = useState<string>('');

  // Track unsaved changes by comparing current hash with last saved hash
  useEffect(() => {
    // Initialize saved hash when config is first loaded
    if (appContext.alertConfig.meta.hash && savedConfigHash === '') {
      setSavedConfigHash(appContext.alertConfig.meta.hash);
      setHasUnsavedChanges(false);
    }
    // Check if current config differs from saved config
    else if (savedConfigHash && appContext.alertConfig.meta.hash !== savedConfigHash) {
      setHasUnsavedChanges(true);
    }
    // If hashes match, no unsaved changes
    else if (savedConfigHash && appContext.alertConfig.meta.hash === savedConfigHash) {
      setHasUnsavedChanges(false);
    }
  }, [appContext.alertConfig.meta.hash, savedConfigHash]);

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

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const config = JSON.parse(e.target?.result as string);
            appContext.setAlertConfig(config);
          } catch (error) {
            console.error('Failed to parse config file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const bProps = save? {loading: true, loaderProps:{ type: 'dots' }} : {};
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
          <Group>
              <ActionIcon 
              variant="light" 
              color="blue"
              onClick={() => {
                setPreviewOpened(true);
              }}
              title="Preview Alert"
            ><IconPlayerPlay /></ActionIcon>
            <ActionIcon 
              variant="light" 
              color="blue"
              onClick={() => {
                window.open(import.meta.env.VITE_SINK_URL + "#token=" + appContext.sink + "&preview=true", '_blank');
              }}
              title="Preview in Browser"
            ><IconEye /></ActionIcon>
                        
            <ActionIcon 
              variant="light"
              color="green"
              onClick={handleExport}
              title="Export Alert Config"
            >
              <IconPackageExport/>
            </ActionIcon>
            <ActionIcon 
              variant="light"
              color="orange"
              onClick={handleImport}
              title="Import Alert Config"
            >
              <IconPackageImport/>
            </ActionIcon>
            <ActionIcon 
              variant="light"
              color={hasUnsavedChanges ? "red" : "gray"}
              {...bProps}
              onClick={() => {
                setSave(true);
                appContext.uploadAlertConfig().then(() => {
                  setSave(false);
                  setSavedConfigHash(appContext.alertConfig.meta.hash);
                  setHasUnsavedChanges(false);
                });
              }}
              title="Save Alert Config"
            >
              <IconDeviceFloppy/>
            </ActionIcon>
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
      </AppShell.Main>
    </AppShell>
  );
};

export default AlertEditor;
