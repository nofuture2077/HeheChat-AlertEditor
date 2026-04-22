import { Modal, Select, TextInput, Button, Stack, NumberInput } from '@mantine/core';
import { useState, useEffect } from 'react';
import { EventMainType, EventType, EventTypeMapping, getAlert, Event, EventAlertConfig } from './types';

interface PreviewModalProps {
  alertConfig: EventAlertConfig;
  channel: string;
  opened: boolean;
  onClose: () => void;
  onSubmit: (event: any) => void;
}

export function PreviewModal({ opened, onClose, onSubmit, channel, alertConfig }: PreviewModalProps) {
  const [mainType, setMainType] = useState<EventMainType>('follow');
  const [eventType, setEventType] = useState<EventType>('follow');
  const [username, setUsername] = useState('TestUser');
  const [usernameTo, setUsernameTo] = useState('GiftedUser');
  const [amount, setAmount] = useState<number | ''>(1000);
  const [amount2, setAmount2] = useState<number | ''>(1);
  const [text, setText] = useState('Test message');
  const [rewardTitle, setRewardTitle] = useState('TTS');

  const alertTypes: Record<string, string> = {
    'sub': 'Subscriptions',
    'subgift': "Gift-Subs",
    "subgiftb": "Received Gift Subs",
    "raid": "Raids",
    "follow": "Follows",
    "donation": "Donations",
    "cheer": "Bit-Donations",
    "channelPointRedemption": "Channel Points",
    "kofi": "Ko-Fi Integration",
    "hypetrain": "Hypetrain",
    "tts": "Read Chat",
    "streak": "Watch Streak"
  };

  const mainTypes = ['follow', 'raid', 'sub', 'subgift', 'subgiftb', 'cheer', 'donation', 'channelPointRedemption', 'kofi', 'hypetrain', 'tts', 'streak'].map(type => ({
    value: type,
    label: alertTypes[type]
  }));
  
  const getEventTypes = (mainType: EventMainType): EventType[] => {
    return Object.entries(EventTypeMapping)
      .filter(([_, value]) => value === mainType && value !== _)
      .map(([key]) => key as EventType);
  };

  const eventTypes = getEventTypes(mainType);

  useEffect(() => {
    if (eventTypes.length > 0) {
      setEventType(eventTypes[0]);
    } else {
      setEventType(mainType as EventType);
    }
  }, [mainType]);

  const handleSubmit = () => {
    const eventData = {
      rewardTitle,
      username,
      eventType,
      text: [{text}]
    };
    const event: Event = {
      id: Date.now(),
      channel,
      username,
      eventtype: eventType,
      date: Date.now(),
      ...(usernameTo && mainType === 'subgiftb' && { usernameTo }),
      ...(amount !== '' && { amount }),
      ...(amount2 !== '' && mainType === 'sub' && { amount2 }),
      text: JSON.stringify(eventData),
    };
    event.eventAlert = getAlert(event, eventData, alertConfig);
    onSubmit(event);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Preview Alert" size="md">
      <Stack>
        <Select
          label="Event Main Type"
          data={mainTypes}
          value={mainType}
          onChange={(value) => setMainType(value as EventMainType)}
        />
        
        {eventTypes.length > 0 && (
          <Select
            label="Event Type"
            data={eventTypes}
            value={eventType}
            onChange={(value) => setEventType(value as EventType)}
          />
        )}

        <TextInput
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {mainType === 'subgiftb' && (
          <TextInput
            label="Username To"
            value={usernameTo}
            onChange={(e) => setUsernameTo(e.target.value)}
          />
        )}

        {mainType !== 'subgiftb' && (
        <NumberInput
          label="Amount"
          value={amount}
          onChange={(val) => setAmount(val as number | '')}
          min={0}
        />)}

        {mainType === 'sub' && (
          <NumberInput
            label="Amount 2"
            value={amount2}
            onChange={(val) => setAmount2(val as number | '')}
            min={1}
          />
        )}

        <TextInput
          label="Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {mainType === 'channelPointRedemption' && (
          <TextInput
            label="Reward Title"
            value={rewardTitle}
            onChange={(e) => setRewardTitle(e.target.value)}
          />
        )}

        <Button onClick={handleSubmit}>Fire Event</Button>
      </Stack>
    </Modal>
  );
}
