import { useContext, useState } from 'react';
import { AppShell, Image, Group, Text, Button } from '@mantine/core';
import logo from '@/favicon.svg'
import { Navigation } from './NavBar';
import { AppContext } from '@/ApplicationContext';
import { IconUpload } from '@tabler/icons-react'

const AlertEditor = () => {
  const appContext = useContext(AppContext);
  const [save, setSave] = useState(false);

  const bProps = save? {loading: true, loaderProps:{ type: 'dots' }} : {};
  return (
    <AppShell
      header={{ height: 52 }}
      padding="md"
    >
      <AppShell.Header p={10} pl={30}>
        <Group>
            <Image src={logo} h={32}/>
            <Text fw={700} size="18px">HEHE CHAT - Editor</Text>
          <Button variant="gradient"
          {...bProps}
          onClick={() => {setSave(true);appContext.uploadAlertConfig().then(() => {
            setSave(false);
          })}}
      gradient={{ from: 'blue', to: 'cyan', deg: 90 }} rightSection={save ? null : <IconUpload/>}>Save</Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main><Navigation/></AppShell.Main>
    </AppShell>
  );
};

export default AlertEditor;
