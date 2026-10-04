import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { safeMapDocument, type SafeMapHandle, type SafeMapProps } from './safe-map-document';

const source = { html: safeMapDocument };

export default forwardRef<SafeMapHandle, SafeMapProps>(function SafeZoneMap({ onEvent }, ref) {
  const webView = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({
    send(command) {
      const payload = JSON.stringify(command).replace(/</g, '\\u003c');
      webView.current?.injectJavaScript(`window.safeMapReceive && window.safeMapReceive(${payload}); true;`);
    },
  }), []);

  return <WebView ref={webView} containerStyle={StyleSheet.absoluteFill} style={{ flex: 1 }} source={source}
    originWhitelist={['*']} javaScriptEnabled scrollEnabled={false}
    applicationNameForUserAgent="ReliefSafeMap/1.0"
    onMessage={({ nativeEvent }) => {
      try { onEvent(JSON.parse(nativeEvent.data)); } catch { /* Ignore malformed messages. */ }
    }}
    onError={() => onEvent({ type: 'error' })}
    onContentProcessDidTerminate={() => onEvent({ type: 'error' })}
    onShouldStartLoadWithRequest={request => {
      if (request.url === 'about:blank' || request.url.startsWith('about:blank#')) return true;
      if (request.url.startsWith('https://www.openstreetmap.org/')) {
        void Linking.openURL(request.url).catch(() => onEvent({ type: 'error' }));
      }
      return false;
    }} />;
});
