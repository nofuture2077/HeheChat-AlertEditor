import { formatString } from '../helper';
import { Event, EventAlert, EventMainType, EventType, EventTypeMapping } from '../types';

export type SampleData = {
  username: string;
  usernameTo: string;
  amount: number | '';
  amount2: number | '';
  text: string;
  rewardTitle: string;
  currency: string;
  hypetrainType: HypetrainType;
};

export type HypetrainType = 'hypeTrainBegin' | 'hypeTrainLevel' | 'hypeTrainEnd';

export const HYPETRAIN_TYPES: { value: HypetrainType, label: string }[] = [
  { value: 'hypeTrainBegin', label: 'Start' },
  { value: 'hypeTrainLevel', label: 'Level up' },
  { value: 'hypeTrainEnd', label: 'End' },
];

/** Main types whose events carry a ${currency} */
export const CURRENCY_TYPES: EventMainType[] = ['donation', 'kofi'];

export const DEFAULT_SAMPLE_DATA: SampleData = {
  username: 'TestUser',
  usernameTo: 'GiftedUser',
  amount: 1000,
  amount2: 1,
  text: 'Test message',
  rewardTitle: 'TTS',
  currency: 'EUR',
  hypetrainType: 'hypeTrainBegin',
};

export const EVENT_TYPE_LABELS: Record<EventMainType, string> = {
  'sub': 'Subscriptions',
  'subgift': 'Gift-Subs',
  'subgiftb': 'Received Gift Subs',
  'raid': 'Raids',
  'follow': 'Follows',
  'donation': 'Donations',
  'cheer': 'Bit-Donations',
  'channelPointRedemption': 'Channel Points',
  'kofi': 'Ko-Fi Integration',
  'hypetrain': 'Hypetrain',
  'tts': 'Read Chat',
  'streak': 'Watch Streak'
};

export function getEventSubtypes(mainType: EventMainType): EventType[] {
  return Object.entries(EventTypeMapping)
    .filter(([key, value]) => value === mainType && value !== key)
    .map(([key]) => key as EventType);
}

export function defaultEventSubtype(mainType: EventMainType): EventType {
  return getEventSubtypes(mainType)[0] || (mainType as EventType);
}

/**
 * Builds a test event plus the parsed event data (used for 'matches' specifiers),
 * mirroring what the backend sends to the overlay.
 */
export function buildSampleEvent(channel: string, eventType: EventType, sample: SampleData): { event: Event, eventData: Record<string, unknown> } {
  const mainType = EventTypeMapping[eventType];
  const eventData = {
    rewardTitle: sample.rewardTitle,
    username: sample.username,
    eventType,
    text: [{ text: sample.text }],
    ...sampleEventVars(mainType, sample),
  };
  const event: Event = {
    id: Date.now(),
    channel,
    username: sample.username,
    eventtype: eventType,
    date: Date.now(),
    ...(sample.usernameTo && mainType === 'subgiftb' && { usernameTo: sample.usernameTo }),
    ...(sample.amount !== '' && { amount: sample.amount }),
    ...(sample.amount2 !== '' && mainType === 'sub' && { amount2: sample.amount2 }),
    text: JSON.stringify(eventData),
  };
  return { event, eventData };
}

/** Event type specific variables the backend adds to the event data */
function sampleEventVars(mainType: EventMainType, sample: SampleData): Record<string, unknown> {
  if (CURRENCY_TYPES.includes(mainType)) {
    return { currency: sample.currency };
  }
  if (mainType === 'hypetrain') {
    return { type: sample.hypetrainType, level: Number(sample.amount || 0) };
  }
  return {};
}

const SCREEN_POSITION_CLASSES = ['top', 'middle', 'bottom', 'left', 'center', 'right'];

/**
 * Replaces the screen position (vertical/horizontal) with a centered one, keeping all other layout classes.
 */
export function centerPosition(position?: string): string {
  return [
    ...(position || '').split(' ').filter(p => p && !SCREEN_POSITION_CLASSES.includes(p)),
    'middle',
    'center',
  ].join(' ');
}

/**
 * Static visual alert (no audio) for the overlay preview, with variables filled from sample data.
 */
export function toVisualAlert(alert: EventAlert, channel: string, sample: SampleData) {
  const vars = {
    ...sampleEventVars(EventTypeMapping[alert.type], sample),
    ...sample,
    amount: Number(sample.amount || 0),
    amount2: Number(sample.amount2 || 0),
  };
  return {
    image: alert.visual?.element || undefined,
    headline: formatString(alert.visual?.headline || '', vars),
    text: formatString(alert.visual?.text || '', vars),
    position: alert.visual?.position,
    layout: alert.visual?.layout,
    channel,
  };
}
