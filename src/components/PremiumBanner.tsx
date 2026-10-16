import { useContext, useState } from 'react';
import { Button, CloseButton, Group, Paper, Stack, Text } from '@mantine/core';
import { IconCrown } from '@tabler/icons-react';
import { AppContext } from '../ApplicationContext';
import { PREMIUM_URL } from './helper';

const PREMIUM_FEATURES = 'premium Google voices';

// Ad for channels without premium, can be dismissed for the current session
export const PremiumBanner = () => {
  const appContext = useContext(AppContext);
  const [dismissed, setDismissed] = useState(false);
  const channel = appContext.alertConfig.meta.channel;

  if (!appContext.premiumLoaded || appContext.isPremium || dismissed) {
    return null;
  }

  return (
    <Paper withBorder p="sm" mb="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap="xs">
          <Group gap="xs">
            <IconCrown size={18} color="var(--mantine-color-grape-6)" />
            <Text fw={600}>Get more out of your alerts with HeheChat Pro</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {channel ? <b>{channel}</b> : 'This channel'} doesn't have HeheChat Pro yet. Upgrade to unlock {PREMIUM_FEATURES} and support HeheChat.
          </Text>
        </Stack>
        <CloseButton size="sm" aria-label="Dismiss" onClick={() => setDismissed(true)} />
      </Group>
      <Group justify="flex-end" mt="xs">
        <Button component="a" href={PREMIUM_URL} target="_blank" color="grape" leftSection={<IconCrown size={16} />}>
          Get Pro
        </Button>
      </Group>
    </Paper>
  );
};
