import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🚨 ඔයාගේ IP එක මෙතනට දෙන්න
  const IP_ADDRESS = '10.217.241.42'; // <--- මෙතන ඔයාගේ Wi-Fi IP එක දාන්න

  // REST API URL (Logistics Service - Port 8000) - පරණ ඒවා ගන්න
  const REST_BACKEND_URL = `http://${IP_ADDRESS}:8000/api`;
  // WebSocket URL (RTO Service - Port 8080) - අලුත් ඒවා Live ගන්න
  const WS_URL = `ws://${IP_ADDRESS}:8000/ws`;

  // 1. Initial Load එකට සහ Pull-to-refresh එකට අදාළ Function එක
  const fetchAlerts = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return;

      const res = await axios.get(`${REST_BACKEND_URL}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAlerts(res.data);
    } catch (error: any) {
      console.error("Failed to fetch alerts:", error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Component එක Load වෙද්දී වැඩ කරන ප්‍රධාන තැන (REST + WebSocket)
  useEffect(() => {
    // මුලින්ම පරණ ඩේටා ටික API එකෙන් අරන් පෙන්නනවා
    fetchAlerts();

    let ws: WebSocket | null = null;

    // Live Connection එක හදන Function එක
    const connectWebSocket = async () => {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return;

      // Token එක යවලා RTO (Real-Time Operations) සර්විස් එකට කනෙක්ට් වෙනවා
      ws = new WebSocket(WS_URL, null, {
        headers: { Authorization: `Bearer ${token}` }
      });

      ws.onopen = () => {
        console.log("✅ WebSocket Connected Successfully!");
      };

      // අලුත් Alert එකක් ආපු ගමන් මේක Trigger වෙනවා!
      ws.onmessage = (event) => {
        try {
          const newAlert = JSON.parse(event.data);
          console.log("🚨 අලුත් Live Alert එකක් ආවා:", newAlert);
          
          // ආපු අලුත් Alert එක පරණ ලිස්ට් එකේ උඩින්ම (Top) එකතු කරනවා
          setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
          
        } catch (e) {
          console.error("WebSocket Message Parsing Error:", e);
        }
      };

      ws.onerror = (e: any) => {
        console.error("❌ WebSocket Error:", e);
      };

      ws.onclose = (e) => {
        console.log("⚠️ WebSocket Connection Closed.");
        console.log(e.code, e.reason);
      };
    };

    connectWebSocket();

    // 3. User මේ ස්ක්‍රීන් එකෙන් යද්දී (Unmount) Connection එක වහලා දානවා
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  // අනතුරේ බරපතලකම අනුව Style කරන Function එක
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