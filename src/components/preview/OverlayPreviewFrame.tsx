import { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Badge, Box, Loader, Center } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { IconVolumeOff } from '@tabler/icons-react';
import { AppContext, AppContextProps } from '../../ApplicationContext';
import { Event } from '../types';
import { toVisualAlert } from './buildPreview';

const OVERLAY_WIDTH = 1920;
const OVERLAY_HEIGHT = 1080;

const SINK_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_SINK_URL).origin;
  } catch {
    return undefined;
  }
})();

export type StaticPreviewAlert = ReturnType<typeof toVisualAlert>;

export interface OverlayPreviewHandle {
  /** Play a full test event (visual, jingle, TTS) with the current draft config */
  playEvent: (event: Event) => void;
  /** Show a static alert that stays visible (no audio) */
  show: (alert: StaticPreviewAlert) => void;
  clear: () => void;
}

/**
 * Embeds the real browsersource overlay in an iframe and feeds it the unsaved alert config via postMessage.
 */
export const OverlayPreviewFrame = forwardRef<OverlayPreviewHandle>(function OverlayPreviewFrame(_props, ref) {
  const appContext = useContext<AppContextProps>(AppContext);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { ref: sizeRef, width } = useElementSize();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<{ audio: boolean, connected: boolean }>({ audio: true, connected: true });
  // Last static alert, re-sent when the overlay (re)loads
  const pendingShow = useRef<StaticPreviewAlert | null>(null);

  const post = (message: Record<string, unknown>) => {
    if (SINK_ORIGIN) {
      iframeRef.current?.contentWindow?.postMessage(message, SINK_ORIGIN);
    }
  };

  const sendConfig = () => {
    post({ type: 'hehe-preview:config', channel: appContext.alertConfig.meta.channel, config: appContext.alertConfig });
  };

  useEffect(() => {
    const handleMessage = (ev: MessageEvent) => {
      if (ev.origin !== SINK_ORIGIN || ev.source !== iframeRef.current?.contentWindow || !ev.data) {
        return;
      }
      if (ev.data.type === 'hehe-preview:ready') {
        setReady(true);
        sendConfig();
        if (pendingShow.current) {
          post({ type: 'hehe-preview:show', alert: pendingShow.current });
        }
      }
      if (ev.data.type === 'hehe-preview:status') {
        setStatus(prev => (prev.audio === !!ev.data.audio && prev.connected === !!ev.data.connected)
          ? prev
          : { audio: !!ev.data.audio, connected: !!ev.data.connected });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  });

  // Keep the overlay in sync with the unsaved config (files included)
  useEffect(() => {
    if (!ready) {
      return;
    }
    const timeout = setTimeout(sendConfig, 300);
    return () => clearTimeout(timeout);
  }, [ready, appContext.alertConfig]);

  useImperativeHandle(ref, () => ({
    playEvent: (event: Event) => {
      sendConfig();
      post({ type: 'hehe-preview:event', event });
    },
    show: (alert: StaticPreviewAlert) => {
      pendingShow.current = alert;
      post({ type: 'hehe-preview:show', alert });
    },
    clear: () => {
      pendingShow.current = null;
      post({ type: 'hehe-preview:clear' });
    },
  }));

  const src = `${import.meta.env.VITE_SINK_URL}#token=${appContext.sink}&preview=true&embed=true`;
  const scale = width / OVERLAY_WIDTH;

  return (
    <Box
      ref={sizeRef}
      pos="relative"
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid var(--mantine-color-dark-4)',
        backgroundColor: '#3a3a3a',
        backgroundImage: 'repeating-conic-gradient(#444 0% 25%, #3a3a3a 0% 50%)',
        backgroundSize: '32px 32px',
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Overlay preview"
        allow="autoplay"
        style={{
          width: OVERLAY_WIDTH,
          height: OVERLAY_HEIGHT,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: 'transparent',
          colorScheme: 'normal',
        }}
      />
      {!ready && (
        <Center pos="absolute" inset={0}>
          <Loader size="sm" />
        </Center>
      )}
      {ready && !status.connected && (
        <Badge pos="absolute" top={8} left={8} color="yellow" variant="filled" size="sm">
          Overlay is connecting…
        </Badge>
      )}
      {ready && status.connected && !status.audio && (
        <Badge pos="absolute" top={8} left={8} color="pink" variant="filled" size="sm" leftSection={<IconVolumeOff size={12} />}
          style={{ pointerEvents: 'none' }}>
          Click the preview to enable sound
        </Badge>
      )}
    </Box>
  );
});
