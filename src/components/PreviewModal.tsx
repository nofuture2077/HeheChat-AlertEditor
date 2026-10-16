import { Modal, Select, TextInput, Button, Stack, NumberInput, Flex, Box, ScrollArea, Group, Switch, Text, Divider, Alert } from '@mantine/core';
import { useState, useEffect, useContext, useRef } from 'react';
import { IconExternalLink, IconPlayerPlay, IconBroadcast, IconPlayerStop, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { EventMainType, EventType, getAlert, EventAlert } from './types';
import { AppContext, AppContextProps } from '../ApplicationContext';
import { OverlayPreviewFrame, OverlayPreviewHandle } from './preview/OverlayPreviewFrame';
import { ProVoicePromo } from './ProVoicePromo';
import { buildSampleEvent, CURRENCY_TYPES, DEFAULT_SAMPLE_DATA, defaultEventSubtype, EVENT_TYPE_LABELS, getEventSubtypes, HYPETRAIN_TYPES, HypetrainType, SampleData } from './preview/buildPreview';

interface PreviewModalProps {
  opened: boolean;
  onClose: () => void;
  initialType?: EventMainType;
  /** Alert being edited (unsaved); played instead of the alert picked from the config */
  forcedAlert?: EventAlert;
}

const MAIN_TYPES: EventMainType[] = ['follow', 'raid', 'sub', 'subgift', 'subgiftb', 'cheer', 'donation', 'channelPointRedemption', 'kofi', 'hypetrain', 'tts', 'streak'];

export function openOverlayInNewTab(sink?: string) {
  window.open(import.meta.env.VITE_SINK_URL + "#token=" + sink + "&preview=true", '_blank');
}

export function PreviewModal({ opened, onClose, initialType, forcedAlert }: PreviewModalProps) {
  const appContext = useContext<AppContextProps>(AppContext);
  const frameRef = useRef<OverlayPreviewHandle>(null);
  const [mainType, setMainType] = useState<EventMainType>(initialType || 'follow');
  const [eventType, setEventType] = useState<EventType>(defaultEventSubtype(initialType || 'follow'));
  const [sample, setSample] = useState<SampleData>(DEFAULT_SAMPLE_DATA);
  const [useForcedAlert, setUseForcedAlert] = useState(true);

  const channel = appContext.alertConfig.meta.channel;
  const eventTypes = getEventSubtypes(mainType);
  const updateSample = (patch: Partial<SampleData>) => setSample(prev => ({ ...prev, ...patch }));

  useEffect(() => {
    if (opened && initialType) {
      setMainType(initialType);
      setEventType(defaultEventSubtype(initialType));
    }
  }, [opened, initialType]);

  const buildEvent = () => {
    const { event, eventData } = buildSampleEvent(channel, eventType, sample);
    event.eventAlert = (forcedAlert && useForcedAlert) ? forcedAlert : getAlert(event, eventData, appContext.alertConfig);
    return event;
  };

  const buildPlayableEvent = () => {
    const event = buildEvent();
    if (!event.eventAlert) {
      notifications.show({ color: 'yellow', title: 'No matching alert', message: `No ${EVENT_TYPE_LABELS[mainType]} alert matches this event.` });
      return undefined;
    }
    return event;
  };

  const handlePlay = () => {
    const event = buildPlayableEvent();
    if (event) {
      frameRef.current?.playEvent(event);
    }
  };

  // Plays the alert as configured, only the TTS voice is replaced (alerts without TTS text use the given text)
  const handlePlayWithVoice = (voice: string, text: string) => {
    const event = buildPlayableEvent();
    if (!event?.eventAlert) {
      return;
    }
    const tts = event.eventAlert.audio?.tts;
    event.eventAlert = {
      ...event.eventAlert,
      audio: {
        ...event.eventAlert.audio,
        tts: { text: tts?.text || text, voiceType: 'google', voiceSpecifier: voice, voiceParams: tts?.voiceParams || {} }
      }
    };
    frameRef.current?.playEvent(event);
  };

  const handleSendToOverlay = () => {
    appContext.replayEvent(buildEvent());
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Alert Preview" fullScreen>
      <Flex gap="md" direction={{ base: 'column', md: 'row' }} align="flex-start">
        <Box style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <Box style={{ width: 'min(100%, calc((100vh - 100px) * 16 / 9))' }}>
            <OverlayPreviewFrame ref={frameRef} />
          </Box>
        </Box>

        <ScrollArea.Autosize mah="calc(100vh - 100px)" w={{ base: '100%', md: 340 }} style={{ flexShrink: 0 }}>
          <Stack gap="sm" pr="sm">
            {forcedAlert && (
              <Switch
                label={`Play "${forcedAlert.name || 'unnamed'}" (being edited)`}
                checked={useForcedAlert}
                onChange={(ev) => setUseForcedAlert(ev.currentTarget.checked)}
              />
            )}

            <Select
              label="Event Main Type"
              data={MAIN_TYPES.map(type => ({ value: type, label: EVENT_TYPE_LABELS[type] }))}
              value={mainType}
              onChange={(value) => {
                const type = (value || mainType) as EventMainType;
                setMainType(type);
                setEventType(defaultEventSubtype(type));
              }}
            />

            {eventTypes.length > 0 && (
              <Select
                label="Event Type"
                data={eventTypes}
                value={eventType}
                onChange={(value) => setEventType((value || eventType) as EventType)}
              />
            )}

            {mainType === 'hypetrain' && (
              <Select
                label="Hypetrain Event"
                data={HYPETRAIN_TYPES}
                value={sample.hypetrainType}
                onChange={(value) => updateSample({ hypetrainType: (value || sample.hypetrainType) as HypetrainType })}
              />
            )}

            <TextInput
              label="Username"
              value={sample.username}
              onChange={(e) => updateSample({ username: e.target.value })}
            />

            {mainType === 'subgiftb' && (
              <TextInput
                label="Username To"
                value={sample.usernameTo}
                onChange={(e) => updateSample({ usernameTo: e.target.value })}
              />
            )}

            {mainType !== 'subgiftb' && (
              <NumberInput
                label={mainType === 'hypetrain' ? 'Level' : 'Amount'}
                value={sample.amount}
                onChange={(val) => updateSample({ amount: val as number | '' })}
                min={0}
              />
            )}

            {CURRENCY_TYPES.includes(mainType) && (
              <TextInput
                label="Currency"
                description="Currency code, e.g. EUR or USD"
                value={sample.currency}
                onChange={(e) => updateSample({ currency: e.target.value })}
              />
            )}

            {mainType === 'sub' && (
              <NumberInput
                label="Amount 2"
                value={sample.amount2}
                onChange={(val) => updateSample({ amount2: val as number | '' })}
                min={1}
              />
            )}

            <TextInput
              label="Text"
              value={sample.text}
              onChange={(e) => updateSample({ text: e.target.value })}
            />

            {mainType === 'channelPointRedemption' && (
              <TextInput
                label="Reward Title"
                value={sample.rewardTitle}
                onChange={(e) => updateSample({ rewardTitle: e.target.value })}
              />
            )}

            <Group grow>
              <Button leftSection={<IconPlayerPlay size={16} />} onClick={handlePlay}>Play</Button>
              <Button variant="default" leftSection={<IconPlayerStop size={16} />} onClick={() => frameRef.current?.clear()}>Clear</Button>
            </Group>

            <Text size="xs" c="dimmed">
              The preview uses your unsaved changes. Click inside the preview once if sound doesn't play.
            </Text>

            <ProVoicePromo onPlayAlert={handlePlayWithVoice} />

            <Divider label="OBS overlay" labelPosition="left" mt="sm" />

            <Button variant="light" leftSection={<IconBroadcast size={16} />} onClick={handleSendToOverlay}>
              Send to OBS overlay
            </Button>
            <Button variant="subtle" leftSection={<IconExternalLink size={16} />} onClick={() => openOverlayInNewTab(appContext.sink)}>
              Open overlay preview in new tab
            </Button>
            <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />} p="xs">
              <Text size="xs">The OBS overlay and preview tabs use your saved config — save first to see your latest changes there.</Text>
            </Alert>
          </Stack>
        </ScrollArea.Autosize>
      </Flex>
    </Modal>
  );
}
