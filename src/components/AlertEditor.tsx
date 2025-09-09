import { useContext, useState, useEffect } from 'react';
import { AppShell, Image, Group, Text, ActionIcon, Modal, Button } from '@mantine/core';
import { AlertConfigurator } from './AlertConfigurator';
import { AppContext } from '../ApplicationContext';
import { IconDeviceFloppy, IconEye, IconPackageExport, IconPackageImport, IconPlayerPlay } from '@tabler/icons-react'
import { PreviewModal } from './PreviewModal';
import { HeaderLogo } from './HeaderLogo';
import { formatFileSize } from './helper';

const AlertEditor = () => {
  const appContext = useContext(AppContext);
  const [save, setSave] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedConfigHash, setSavedConfigHash] = useState<string>('');
  const [fileSizeWarningOpened, setFileSizeWarningOpened] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(false);

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

  // Calculate the file size of the alert config
  const calculateConfigSize = () => {
    const configString = JSON.stringify(appContext.alertConfig);
    return new Blob([configString]).size;
  };

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

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Check file size before reading
        if (file.size > 100 * 1024 * 1024) { // 100MB in bytes
          setFileSizeError(true);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const config = JSON.parse(e.target?.result as string);
            const configSize = new Blob([JSON.stringify(config)]).size;
            const sizeInMB = configSize / (1024 * 1024);
            
            if (sizeInMB >= 100) {
              setFileSizeError(true);
            } else if (sizeInMB >= 50) {
              // Set the config but also show warning
              appContext.setAlertConfig(config);
              setFileSizeWarningOpened(true);
            } else {
              appContext.setAlertConfig(config);
            }
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
                const configSize = calculateConfigSize();
                const sizeInMB = configSize / (1024 * 1024);
                const sizeStatus = getFileSizeStatus(configSize);
                
                if (sizeStatus.status === 'error') {
                  setFileSizeError(true);
                } else if (sizeStatus.status === 'warning') {
                  setFileSizeWarningOpened(true);
                } else {
                  // Size is okay, proceed with save
                  setSave(true);
                  appContext.uploadAlertConfig().then(() => {
                    setSave(false);
                    setSavedConfigHash(appContext.alertConfig.meta.hash);
                    setHasUnsavedChanges(false);
                  });
                }
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
        
        {/* File Size Warning Modal */}
        <Modal
          opened={fileSizeWarningOpened}
          onClose={() => setFileSizeWarningOpened(false)}
          title="Alert Config Size Warning"
        >
          <Text mb="md">
            Your alert configuration is larger than 50MB ({formatFileSize(calculateConfigSize())}). 
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
                setSave(true);
                appContext.uploadAlertConfig().then(() => {
                  setSave(false);
                  setSavedConfigHash(appContext.alertConfig.meta.hash);
                  setHasUnsavedChanges(false);
                });
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
            Your alert configuration is too large ({formatFileSize(calculateConfigSize())}).
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
