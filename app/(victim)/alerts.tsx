import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, AppState } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { api, getAccessToken } from '../../services/api';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 20;
  const BASE_RECONNECT_DELAY = 3000;   // 3s
  const MAX_RECONNECT_DELAY = 30000;   // 30s

  // Derive WebSocket URL cleanly from EXPO_PUBLIC_BACKEND_URL
  const getWsUrl = (token?: string) => {
    const raw = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.8.161:8000/api').trim();
    const base = raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    const endpoint = `${wsBase}/ws`;
    return token ? `${endpoint}?token=${encodeURIComponent(token)}` : endpoint;
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data);
    } catch (error: any) {
      console.error("Failed to fetch alerts:", error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Force-refresh the access token before opening a new WS connection.
  // The interceptor on `api` handles the actual refresh flow; we just
  // make a lightweight authenticated call so the interceptor refreshes
  // a stale token, then read the (now-fresh) token from secure storage.
  const getFreshToken = async (): Promise<string | null> => {
    try {
      // First try the stored token directly
      let token = await getAccessToken();
      if (!token) return null;

      // Validate by making a lightweight call — the axios response
      // interceptor will silently refresh if the token is expired.
      try {
        await api.get('/alerts', { params: { limit: 1 } });
      } catch {
        // The interceptor may have refreshed; grab the updated token
      }

      // Re-read: if the interceptor refreshed, SecureStore now holds
      // the new access_token.
      token = await getAccessToken();
      return token;
    } catch {
      return null;
    }
  };

  const scheduleReconnect = () => {
    if (!isMountedRef.current) return;
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log("🛑 Max reconnect attempts reached. Giving up. Pull-to-refresh to retry.");
      return;
    }

    // Exponential backoff: 3s, 6s, 12s, 24s, 30s (capped)
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
      MAX_RECONNECT_DELAY
    );
    reconnectAttemptRef.current += 1;

    console.log(`🔄 Auto-reconnecting in ${delay / 1000}s... (attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        connectWebSocket();
      }
    }, delay);
  };

  const connectWebSocket = async () => {
    // Prevent overlapping connection attempts
    if (isConnectingRef.current) {
      console.log("⏳ Connection attempt already in progress, skipping");
      return;
    }
    // If already connected then skip
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("✅ WS already connected, skipping");
      return;
    }

    isConnectingRef.current = true;

    try {
      // Always get a fresh token (will trigger silent refresh if expired)
      const token = await getFreshToken();
      if (!token || !isMountedRef.current) {
        console.warn("⚠️ No valid token for WS connection");
        isConnectingRef.current = false;
        scheduleReconnect();
        return;
      }

      const wsUrl = getWsUrl(token);
      console.log("🔗 Connecting WebSocket to:", wsUrl);

      // Pass token in both query param and subprotocol
      const ws = new WebSocket(wsUrl, ['bearer', token]);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket Connected Successfully to Alerts channel!");
        reconnectAttemptRef.current = 0; // Reset backoff on successful connection
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📩 Received WebSocket Event:", data);
          if (data.type === 'alert') {
            setAlerts((prev) => {
              // skip/update if alert already exists in the list (based on id)
              if (prev.some((a) => String(a.id) === String(data.id))) {
                return prev.map((a) => (String(a.id) === String(data.id) ? { ...a, ...data } : a));
              }
              return [data, ...prev];
            });
          } else if (data.type === 'alert_status_updated') {
            setAlerts((prev) =>
              prev.map((a) => (String(a.id) === String(data.id) ? { ...a, status: data.status } : a))
            );
          } else if (data.type === 'alert_deleted') {
            setAlerts((prev) => prev.filter((a) => String(a.id) !== String(data.id)));
          } else if (data.type === 'force_logout') {
            console.log("🔒 Force logout received:", data.reason);
            // Optionally handle force logout (navigate to login, etc.)
          }
        } catch (e) {
          console.error("WebSocket Message Parsing Error:", e);
        }
      };

      ws.onerror = (e: any) => {
        console.error("❌ WebSocket Error:", e?.message || e);
        isConnectingRef.current = false;
      };

      ws.onclose = (e) => {
        console.log("⚠️ WS Closed:", e.code, e.reason);
        wsRef.current = null;
        isConnectingRef.current = false;

        // 1011 = server internal error (gateway can't reach RTO upstream)
        // 1008 = policy violation (typically bad/expired token)
        if (e.code === 1008) {
          console.log("🔑 Token rejected by server, will refresh before reconnect");
        }

        scheduleReconnect();
      };
    } catch (error: any) {
      console.error("❌ Failed to set up WebSocket:", error?.message || error);
      isConnectingRef.current = false;
      scheduleReconnect();
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchAlerts();
    connectWebSocket();

    // App background/foreground detect — reconnect WS if needed
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isMountedRef.current) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log("📱 App came to foreground, reconnecting WS...");
          reconnectAttemptRef.current = 0; // Reset backoff on foreground
          connectWebSocket();
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
    // Reset reconnect counter so user can manually recover
    reconnectAttemptRef.current = 0;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }
  };

  // style according to severity of the alert (HIGH, MEDIUM, LOW)
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return { color: '#D32F2F', bgColor: '#FFEBEE', icon: 'error' };
      case 'MEDIUM':
        return { color: '#F57C00', bgColor: '#FFF3E0', icon: 'warning' };
      default:
        return { color: '#388E3C', bgColor: '#E8F5E9', icon: 'info' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const sevStyle = getSeverityStyle(item.severity);
    const isClosed = item.status === 'CLOSED';

    return (
      <View
        style={[
          styles.alertCard,
          {
            backgroundColor: isClosed ? '#F5F5F5' : sevStyle.bgColor,
            borderColor: isClosed ? '#BDBDBD' : sevStyle.color,
            opacity: isClosed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.alertHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons
              name={sevStyle.icon as any}
              size={24}
              color={isClosed ? '#757575' : sevStyle.color}
            />
            <Text
              style={[
                styles.alertTitle,
                { color: isClosed ? '#424242' : sevStyle.color },
              ]}
            >
              {' '}
              {item.title}
            </Text>
          </View>
          {isClosed ? (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>අවසන් (CLOSED)</Text>
            </View>
          ) : (
            <View style={[styles.liveBadge, { backgroundColor: sevStyle.color }]}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>

        <Text style={styles.alertMessage}>{item.message}</Text>

        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>ආපදා කළමනාකරණ මධ්‍යස්ථානයෙන් නිකුත් කරන ලද හදිසි නිවේදන.</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 50 }} />
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="bell-slash" size={50} color="#ccc" />
          <Text style={styles.emptyText}>වර්තමානයේ අනතුරු ඇඟවීම් කිසිවක් නොමැත.</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53935']} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 15, backgroundColor: '#020202', marginBottom: 10 },
  subtitle: { fontSize: 13, color: '#ffebee', marginTop: 5 },
  alertCard: { padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1.5, elevation: 2 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  alertMessage: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 10 },
  dateText: { fontSize: 11, color: '#666', textAlign: 'right' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 15, color: '#999' },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closedBadge: {
    backgroundColor: '#757575',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  closedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});