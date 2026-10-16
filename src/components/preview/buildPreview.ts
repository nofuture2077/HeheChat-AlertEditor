import { formatString } from '../helper';
import { Event, EventAlert, EventMainType, EventType, EventTypeMapping, GoogleTTSVoice } from '../types';

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
  username: 'PixelPanda',
  usernameTo: 'CozyCactus',
  amount: 1000,
  amount2: 1,
  text: 'Hello chat!',
  rewardTitle: 'TTS',
  currency: 'EUR',
  hypetrainType: 'hypeTrainBegin',
};

type SampleTextKind = 'sub' | 'cheer' | 'donation' | 'chat';

const SAMPLE_TEXT_KINDS: Partial<Record<EventMainType, SampleTextKind>> = {
  'sub': 'sub',
  'subgift': 'sub',
  'subgiftb': 'sub',
  'cheer': 'cheer',
  'donation': 'donation',
  'kofi': 'donation',
};

// Sample event messages, keyed by full language code or by its base language
const SAMPLE_TEXTS: Record<string, Record<SampleTextKind, string>> = {
  'en': {
    sub: 'Another month of the best stream on Twitch, love you all!',
    cheer: 'Take my bits and keep up the great content!',
    donation: 'Thanks for always making my evening better, have a pizza on me!',
    chat: 'Hello chat, how is everyone doing today?',
  },
  'de': {
    sub: 'Wieder ein Monat beim besten Stream auf Twitch, ich liebe euch!',
    cheer: 'Nimm meine Bits und mach weiter so!',
    donation: 'Danke, dass du mir jeden Abend versüßt, die Pizza geht auf mich!',
    chat: 'Hallo Chat, wie geht es euch heute?',
  },
  'es': {
    sub: '¡Otro mes en el mejor stream de Twitch, os quiero a todos!',
    cheer: '¡Toma mis bits y sigue con el buen contenido!',
    donation: '¡Gracias por alegrarme siempre la tarde, la pizza corre de mi cuenta!',
    chat: 'Hola chat, ¿qué tal estáis hoy?',
  },
  'fr': {
    sub: 'Encore un mois sur le meilleur stream de Twitch, je vous aime tous !',
    cheer: 'Prends mes bits et continue comme ça !',
    donation: 'Merci de toujours égayer mes soirées, la pizza est pour moi !',
    chat: 'Salut le chat, comment ça va aujourd\'hui ?',
  },
  'it': {
    sub: 'Un altro mese con la migliore live di Twitch, vi voglio bene!',
    cheer: 'Prendi i miei bits e continua così!',
    donation: 'Grazie per rendere sempre migliori le mie serate, la pizza la offro io!',
    chat: 'Ciao chat, come state oggi?',
  },
  'pt': {
    sub: 'Mais um mês na melhor live da Twitch, adoro-vos a todos!',
    cheer: 'Fica com os meus bits e continua assim!',
    donation: 'Obrigado por animares sempre as minhas noites, a pizza é por minha conta!',
    chat: 'Olá chat, como estão hoje?',
  },
  'pt-BR': {
    sub: 'Mais um mês na melhor live da Twitch, amo vocês!',
    cheer: 'Toma meus bits e continua com o conteúdo incrível!',
    donation: 'Valeu por sempre deixar minha noite melhor, a pizza é por minha conta!',
    chat: 'Oi chat, como vocês estão hoje?',
  },
  'nl': {
    sub: 'Weer een maand bij de beste stream op Twitch, ik hou van jullie!',
    cheer: 'Hier zijn mijn bits, ga zo door!',
    donation: 'Bedankt dat je mijn avonden altijd beter maakt, de pizza is van mij!',
    chat: 'Hallo chat, hoe gaat het vandaag met jullie?',
  },
  'pl': {
    sub: 'Kolejny miesiąc na najlepszym streamie na Twitchu, kocham was!',
    cheer: 'Trzymaj moje bitsy i tak trzymaj!',
    donation: 'Dzięki, że zawsze umilasz mi wieczór, pizza ode mnie!',
    chat: 'Cześć czacie, jak się dzisiaj macie?',
  },
  'tr': {
    sub: 'Twitch\'teki en iyi yayında bir ay daha, hepinizi seviyorum!',
    cheer: 'Bitlerimi al ve böyle devam et!',
    donation: 'Akşamlarımı hep güzelleştirdiğin için teşekkürler, pizza benden!',
    chat: 'Selam chat, bugün nasılsınız?',
  },
  'sv': {
    sub: 'Ännu en månad på den bästa streamen på Twitch, älskar er alla!',
    cheer: 'Ta mina bits och fortsätt så!',
    donation: 'Tack för att du alltid gör min kväll bättre, pizzan bjuder jag på!',
    chat: 'Hej chatten, hur mår ni idag?',
  },
  'ru': {
    sub: 'Ещё один месяц на лучшем стриме Twitch, люблю вас всех!',
    cheer: 'Держи мои биты и продолжай в том же духе!',
    donation: 'Спасибо, что всегда делаешь мой вечер лучше, пицца за мой счёт!',
    chat: 'Привет, чат, как у вас дела сегодня?',
  },
  'ja': {
    sub: 'Twitchで一番の配信をまた1か月応援します、みんな大好き！',
    cheer: 'ビッツどうぞ、これからも頑張って！',
    donation: 'いつも楽しい夜をありがとう、ピザ代にしてください！',
    chat: 'こんにちは、みんな今日の調子はどう？',
  },
  'ko': {
    sub: '트위치 최고의 방송과 또 한 달 함께해요, 모두 사랑해요!',
    cheer: '제 비트 받으시고 앞으로도 화이팅!',
    donation: '항상 저녁을 즐겁게 해줘서 고마워요, 피자는 제가 쏠게요!',
    chat: '안녕 채팅, 오늘 다들 어때요?',
  },
};

function sampleTexts(language: string): Record<SampleTextKind, string> {
  return SAMPLE_TEXTS[language] || SAMPLE_TEXTS[language.split('-')[0]] || SAMPLE_TEXTS['en'];
}

/** Sample event message in the given language that fits the event type */
export function getSampleText(language: string, mainType: EventMainType): string {
  return sampleTexts(language)[SAMPLE_TEXT_KINDS[mainType] || 'chat'];
}

/**
 * Language for the sample texts: the language of the first Google voice given, otherwise the browser language.
 */
export function getSampleLanguage(googleVoices: GoogleTTSVoice[], ...voices: ({ voiceType: string, voiceSpecifier: string } | undefined)[]): string {
  for (const voice of voices) {
    if (voice?.voiceType === 'google') {
      const languageCode = googleVoices.find(v => v.name === voice.voiceSpecifier)?.languageCodes[0];
      if (languageCode) {
        return languageCode;
      }
    }
  }
  return navigator.language || 'en';
}

/** Replaces the sample text with the one for the given language and event type, unless the user edited it */
export function withSampleText(sample: SampleData, language: string, mainType: EventMainType): SampleData {
  const isGenerated = sample.text === DEFAULT_SAMPLE_DATA.text
    || Object.values(SAMPLE_TEXTS).some(texts => Object.values(texts).includes(sample.text));
  return isGenerated ? { ...sample, text: getSampleText(language, mainType) } : sample;
}

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
