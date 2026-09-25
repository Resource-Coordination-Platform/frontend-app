import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, AppState } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { api, getAccessToken } from '../../services/api';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);

  const IP_ADDRESS = '192.168.8.161';
  const WS_URL = `ws://${process.env.EXPO_PUBLIC_BACKEND_URL?.split(':')[1]?.split('/')[2]}:8000/ws`;

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

  const connectWebSocket = async () => {
    //If Already connected then skip
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("✅ WS already connected, skipping");
      return;
    }

    const token = await getAccessToken();
    if (!token || !isMountedRef.current) return;

    const ws = new WebSocket(WS_URL, ['bearer', token]);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected Successfully!");
    };

   ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'alert') {
        setAlerts((prev) => {
          // skip if alert already exists in the list (based on id)
          if (prev.some((a) => String(a.id) === String(data.id))) return prev;
          return [data, ...prev];
        });
      }
    } catch (e) {
      console.error("WebSocket Message Parsing Error:", e);
    }
  };


    ws.onerror = (e: any) => {
      console.error("❌ WebSocket Error");
    };

    ws.onclose = (e) => {
      console.log("⚠️ WS Closed:", e.code, e.reason);
      wsRef.current = null;
      
      // if compenent mounted then try to reconnect after 3 seconds
      if (isMountedRef.current) {
        console.log("🔄 Auto-reconnecting in 3s...");
        setTimeout(() => {
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, 3000);
      }
    };
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchAlerts();
    connectWebSocket();

    // App background/foreground detect — if app comes to foreground then reconnect WS if not connected
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isMountedRef.current) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log("📱 App came to foreground, reconnecting WS...");
          connectWebSocket();
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);


  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };


  // style acording to severity of the alert (HIGH, MEDIUM, LOW)
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

    return (
      <View style={[styles.alertCard, { backgroundColor: sevStyle.bgColor, borderColor: sevStyle.color }]}>
        <View style={styles.alertHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialIcons name={sevStyle.icon as any} size={24} color={sevStyle.color} />
            <Text style={[styles.alertTitle, { color: sevStyle.color }]}> {item.title}</Text>
          </View>
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
  emptyText: { marginTop: 15, fontSize: 15, color: '#999' }
});