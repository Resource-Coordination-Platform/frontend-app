import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, SafeAreaView, Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function VictimHomeScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();


  const handleLogout = async () => {
    Alert.alert(
      "ඉවත් වන්න",
      "ඔබට ගිණුමෙන් ඉවත් වීමට අවශ්‍යද?",
      [
        { text: "නැත", style: "cancel" },
        { 
          text: "ඔව්", 
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('user_role');
            router.replace('/welcome');
          }
        }
      ]
    );
  };

  const fetchMyRequests = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/volunteer/requests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRequests(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'ඔබගේ සැසිය අවසන් වී ඇත. කරුණාකර නැවත Login වන්න.');
        handleLogout();
      } else {
        console.error(error);
        Alert.alert('Error', 'දත්ත ලබාගැනීමේදී දෝෂයක් ඇතිවිය.');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#FFC107', icon: 'clock-outline', text: 'ඉල්ලීම යොමු කර ඇත', bgColor: '#FFF8E1' };
      case 'APPROVED':
        return { color: '#2196F3', icon: 'account-hard-hat', text: 'සහන කණ්ඩායම් දැනුවත් කර ඇත', bgColor: '#E3F2FD' };
      case 'ASSIGNED':
        return { color: '#4CAF50', icon: 'truck-fast', text: 'උදව් ඔබ වෙත පැමිණෙමින් තිබේ', bgColor: '#E8F5E9' };
      case 'COMPLETED':
        return { color: '#9E9E9E', icon: 'check-circle', text: 'අවසන් කර ඇත', bgColor: '#F5F5F5' };
      default:
        return { color: '#757575', icon: 'help-circle', text: status, bgColor: '#F5F5F5' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusData = getStatusBadge(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="hands-helping" size={14} color="#E53935" />
            </View>
            <Text style={styles.disasterText}>{item.disaster_type} ආපදාව</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.needsTitle}>අවශ්‍යතාවයන්:</Text>
        <Text style={styles.needsText}>
          {item.needs.map((need: string) => need.replace('other:', '')).join(', ')}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: statusData.bgColor }]}>
          <MaterialCommunityIcons name={statusData.icon as any} size={20} color={statusData.color} />
          <Text style={[styles.statusText, { color: statusData.color }]}>
            {statusData.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* --- Premium Header --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.subtitle}>ඔබගේ ඉල්ලීම් සහ වත්මන් තත්ත්වය</Text>
            </View>
            
            {/* Top Right Logout Button */}
            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="logout" size={22} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Content --- */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 50 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>ඔබ තවමත් කිසිදු ආධාරයක් ඉල්ලා නැත.</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53935']} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#040404' }, // give header color to safe area
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  
  header: { 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? 40 : 20, //space for android status bar
    paddingBottom: 8, 
    backgroundColor: '#040404', 
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#f3d7d7', marginTop: 1 },
  
  logoutBtn: { 
    padding: 5, 
    backgroundColor: 'rgba(255, 68, 68, 0.15)', // light red
    borderRadius: 12,
  },

  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    elevation: 3, // Android Shadow
    shadowColor: '#000', // iOS Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconContainer: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 10,
    marginRight: 10
  },
  disasterText: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12
  },

  needsTitle: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  needsText: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 4, marginBottom: 16, lineHeight: 22 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  statusText: { fontSize: 14, fontWeight: '700', marginLeft: 8 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#9CA3AF', fontWeight: '500' }
});