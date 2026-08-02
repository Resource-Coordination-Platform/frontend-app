import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function VictimHomeScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const BACKEND_URL = 'http://172.22.192.42:8004/api/volunteer/requests'; 

  //logout function 
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_role');
    router.replace('/welcome');
  };


  const fetchMyRequests = async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const res = await axios.get(`${BACKEND_URL}/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRequests(res.data);//this will set the requests state with the data fetched from the backend(res.data) :)
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
      setRefreshing(false); //if you dont put this line refreshing will be true forever and pull to refresh will not work properly :)
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const onRefresh = () => {   // Pull-to-refresh Function එක 
  // passe websocket එකෙන් real-time update එකක් දෙනවා danata meka thiyamu
    setRefreshing(true);
    fetchMyRequests();
  };

  // Status එකට අනුව පාට සහ අයිකන් එක දෙන Function එක
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
            <FontAwesome5 name="hands-helping" size={18} color="#E53935" />
            <Text style={styles.disasterText}> {item.disaster_type} ආපදාව</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

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
    <View style={styles.container}>
      <View style={styles.header}>
                  {/* කලින් තිබ්බ Logout Button එක */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
                  
        <Text style={styles.subtitle}>ඔබ කළ ඉල්ලීම් සහ ඒවායේ වත්මන් තත්ත්වය මෙහි දැක්වේ.</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#E53935" style={{ marginTop: 50 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>ඔබ තවමත් කිසිදු ආධාරයක් ඉල්ලා නැත.</Text>
        </View>
      ) : (
        <FlatList
          data={requests} //meken requests eke thiyena array eka flatlist ekata danawa
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem} //meken thama loop ekak wage ekin ekata uda flatlist  data eke thiyena array eken objects aran item ekak widiyata render karanne....
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53935']} />}
        />
      )}
    </View>
  );
}




const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, backgroundColor: '#040404', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#ffebee', marginTop: 5 },
  logoutBtn: { padding: 8, backgroundColor: '#ff4444', borderRadius: 8 },
  logoutText: { color: 'white', fontWeight: 'bold' },
  
  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  disasterText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 12, color: '#888' },
  
  needsTitle: { fontSize: 13, color: '#666', marginTop: 5 },
  needsText: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 15 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 5
  },
  statusText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#999' }
});