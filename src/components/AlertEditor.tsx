import { useContext, useState } from 'react';
import { AppShell, Image, Group, Text, Button, ActionIcon } from '@mantine/core';
import logo from '../logo.svg'
import { AlertConfigurator } from './AlertConfigurator';
import { AppContext } from '../ApplicationContext';
import { IconUpload, IconPlayerPlay, IconBrowser, IconBrowserCheck, IconDownload, IconFileImport } from '@tabler/icons-react'
import { PreviewModal } from './PreviewModal';

const AlertEditor = () => {
  const appContext = useContext(AppContext);
  const [save, setSave] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);

  const handleExport = () => {
    const config = appContext.alertConfig;
    const filename = `${config.meta.name.replace(/\s+/g, '_')}.json`;
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
          <Group>
            <Image src={logo} h={32}/>
            <Text fw={700} size="18px">HEHE CHAT - Editor</Text>
          </Group>
          <Group>
            { appContext.sink ? (
              <>
              <ActionIcon 
              variant="light" 
              onClick={() => {
                setPreviewOpened(true);
              }}
            ><IconPlayerPlay /></ActionIcon>
            <ActionIcon 
              variant="light" 
              onClick={() => {
                window.open(import.meta.env.VITE_SINK_URL + "#token=" + appContext.sink + "&preview=true", '_blank');
              }}
            ><IconBrowserCheck /></ActionIcon>
            </>
            ) : <><span></span><span></span></>}
            
            <ActionIcon 
              variant="light"
              onClick={handleExport}
              title="Export Alert Config"
            >
              <IconDownload/>
            </ActionIcon>
            <ActionIcon 
              variant="light"
              onClick={handleImport}
              title="Import Alert Config"
            >
              <IconFileImport/>
            </ActionIcon>
            <ActionIcon 
              variant="light"
              {...bProps}
              onClick={() => {setSave(true);appContext.uploadAlertConfig().then(() => {
                setSave(false);
              })}}
            >
              <IconUpload/>
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
