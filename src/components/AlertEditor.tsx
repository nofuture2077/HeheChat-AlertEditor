import { useContext, useState } from 'react';
import { AppShell, Image, Group, Text, Button, ActionIcon } from '@mantine/core';
import logo from '../logo.svg'
import { AlertConfigurator } from './AlertConfigurator';
import { AppContext } from '../ApplicationContext';
import { IconUpload, IconPlayerPlay } from '@tabler/icons-react'
import { PreviewModal } from './PreviewModal';

const AlertEditor = () => {
  const appContext = useContext(AppContext);
  const [save, setSave] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);

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
          { appContext.sink ? (
            <ActionIcon 
            variant="light" 
            onClick={() => {
              setPreviewOpened(true);
              window.open(import.meta.env.VITE_SINK_URL + "#token=" + appContext.sink, '_blank');
            }}
          ><IconPlayerPlay /></ActionIcon>
          ) : <span></span>}
          
          <ActionIcon variant="light"
          {...bProps}
          onClick={() => {setSave(true);appContext.uploadAlertConfig().then(() => {
            setSave(false);
          })}}
          gradient={{ from: 'blue', to: 'cyan', deg: 90 }}><IconUpload/></ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <AlertConfigurator/>
        <PreviewModal
          channel={appContext.alertConfig.meta.channel}
          opened={previewOpened}
          onClose={() => setPreviewOpened(false)}
          onSubmit={appContext.replayEvent}
        />
      </AppShell.Main>
    </AppShell>
  );
};

export default AlertEditor;
