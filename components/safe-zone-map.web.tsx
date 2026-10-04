import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { safeMapDocument, type SafeMapHandle, type SafeMapProps } from './safe-map-document';

export default forwardRef<SafeMapHandle, SafeMapProps>(function SafeZoneMap({ onEvent }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({
    send(command) { frame.current?.contentWindow?.postMessage({ source: 'safe-map-host', command }, '*'); },
  }), []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data?.source === 'safe-map') {
        onEvent(event.data.event);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onEvent]);
  return <iframe ref={frame} title="Safe zones map" srcDoc={safeMapDocument}
    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
    onError={() => onEvent({ type: 'error' })}
    style={{ position: 'absolute', width: '100%', height: '100%', border: 0 }} />;
});
