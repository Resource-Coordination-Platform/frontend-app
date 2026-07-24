import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BACKEND_URL = 'http://172.20.10.5:8004/api'; // ඔයාගේ ලැප් එකේ IP එක දාන්න
export default function EventsFeed() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const config = await getAuthHeader();
      // Backend එකෙන් Events ලිස්ට් එක ඉල්ලනවා
      const response = await axios.get(`${BACKEND_URL}/volunteer/events`, config);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'ආපදා තොරතුරු ලබා ගැනීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
    }
  };

  // භයානකකම (Severity) අනුව පාට වෙනස් කරන්න පොඩි ෆන්ක්ෂන් එකක්
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#CC0000'; // තද රතු
      case 'HIGH': return '#ff4444'; // රතු
      case 'MEDIUM': return '#FF8800'; // තැඹිලි
      default: return '#00C851'; // කොළ
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🚨 හදිසි ආපදා තොරතුරු</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#33b5e5" style={{ marginTop: 50 }} />
      ) : events.length === 0 ? (
        <Text style={styles.noData}>දැනට කිසිදු ආපදා තත්ත්වයක් වාර්තා වී නොමැත. පරෙස්සමින් ඉන්න! 🌿</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchEvents} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={styles.category}>
                   {item.category.replace('_', ' ').toUpperCase()}
                </Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                  <Text style={styles.severityText}>{item.severity}</Text>
                </View>
              </View>
              
              <Text style={styles.details}>📍 ප්‍රදේශය: {item.district}</Text>
              {item.city ? <Text style={styles.details}>🏙️ නගරය: {item.city}</Text> : null}
              <Text style={styles.details}>📌 තත්ත්වය: {item.status}</Text>
              
              <TouchableOpacity 
                style={styles.viewBtn}
                onPress={() => Alert.alert('Event Details', 'මෙහි සම්පූර්ණ විස්තර පෙන්වීමට ඊළඟට Screen එකක් හදමු!')}
              >
                <Text style={styles.viewBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  noData: { textAlign: 'center', fontSize: 16, color: '#888', marginTop: 50 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
  category: { fontSize: 18, fontWeight: 'bold', color: '#33b5e5' },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  severityText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  details: { fontSize: 14, color: '#555', marginBottom: 5 },
  viewBtn: { marginTop: 15, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, alignItems: 'center' },
  viewBtnText: { color: '#333', fontWeight: 'bold' }
});