import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🚨 ඔයාගේ Backend IP එක
  const BACKEND_URL = 'http://172.22.192.42:8002/api'; 
  const fetchAlerts = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      
      console.log("Token එක තියෙනවද?:", token ? "ඔව්" : "නැත");
      console.log("යන URL එක:", `${BACKEND_URL}/alerts`);

      const res = await axios.get(`${BACKEND_URL}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ සාර්ථකව Data ආවා:", res.data);
      setAlerts(res.data);

    } catch (error: any) {
      // 🚨 මෙන්න සුපිරිම Debugging කෑල්ල 🚨
      console.log("❌ API Error එකක් ආවා!");
      
      if (error.response) {
        // Backend එකට ගියා, හැබැයි Backend එකෙන් Error එකක් එව්වා (උදා: 401, 500)
        console.error("Backend Status:", error.response.status);
        console.error("Backend Error Data:", error.response.data);
      } else if (error.request) {
        // Backend එකට ගියේම නෑ! (Network අවුලක්, Timeout එකක් හෝ Firewall එකෙන් Block කරලා)
        console.error("Network Error: Backend එකෙන් කිසිම Response එකක් ආවේ නෑ!");
        console.error("Request Details:", error.message);
        alert("Network Error: Port 8002 ට කනෙක්ට් වෙන්න බෑ. Windows Firewall එක Off කරලා බලන්න.");
      } else {
        // Request එක හදද්දිම මොකක් හරි අවුලක් ගිහින්
        console.error("General Error:", error.message);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  // අනතුරේ බරපතලකම (Severity) අනුව පාට සහ අයිකන් මාරු කරන Function එක
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
          keyExtractor={(item) => item.id}
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
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 13, color: '#ffebee', marginTop: 5 },
  
  alertCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1.5,
    elevation: 2,
  },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  alertMessage: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 10 },
  dateText: { fontSize: 11, color: '#666', textAlign: 'right' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 15, color: '#999' }
});