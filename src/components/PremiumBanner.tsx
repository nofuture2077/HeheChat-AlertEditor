import { useContext, useState } from 'react';
import { Alert, Button, Group, Text } from '@mantine/core';
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
    <Alert
      color="yellow"
      variant="light"
      icon={<IconCrown />}
      title="Get more out of your alerts with HeheChat Pro"
      withCloseButton
      onClose={() => setDismissed(true)}
      mb="md"
    >
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">
          {channel ? <b>{channel}</b> : 'This channel'} doesn't have HeheChat Pro yet. Upgrade to unlock {PREMIUM_FEATURES} and support HeheChat.
        </Text>
        <Button component="a" href={PREMIUM_URL} target="_blank" color="yellow" leftSection={<IconCrown size={16} />} style={{ flexShrink: 0 }}>
          Upgrade
        </Button>
      </Group>
    </Alert>
  );
};
