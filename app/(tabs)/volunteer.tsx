import { useEffect, useState } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Button,TextInput,RefreshControl } from 'react-native';//refresh control used to pull screen and refresh for new events
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useRouter } from 'expo-router';

const BACKEND_URL = 'http://172.20.10.5:8004/api'; // ඔයාගේ ලැප් එකේ IP එක දාන්න

export default function VolunteerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [district, setDistrict] = useState('');

  useEffect(() => {
   fetchDashboardData();
   

    let ws: WebSocket | null = null;
    let isMounted = true; // Component එක live ද කියලා බලන්න

    const connectWebSocket = async () => {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token || !isMounted) return;

      // 🚨 Gateway එක (8000) වෙනුවට කෙලින්ම RTO Go Service එකට (8080) කතා කරමු!
      const WS_URL = `ws://172.20.10.5:8080/ws`; 
      
      // Token එක Sub-protocol එකක් විදිහට යවනවා
      ws = new WebSocket(WS_URL, ['bearer', token]);

      ws.onopen = () => console.log('✅ WebSocket ලයිව් සම්බන්ධ විය!');
      
      ws.onmessage = (event) => {
        console.log('🔔 නව පණිවිඩයක් ආවා:', event.data);
        fetchDashboardData();
        Alert.alert('🚨 හදිසි ආපදාවක්!', 'ඔබට නව මෙහෙයුමක් ලැබී ඇත. කරුණාකර පරීක්ෂා කරන්න.');
      };

      // ඇයි කට් වෙන්නේ කියලා හරියටම බලාගන්න code එකයි reason එකයි print කරමු
      ws.onclose = (e) => console.log(`❌ WebSocket විසන්ධි විය. Code: ${e.code}, Reason: ${e.reason}`);
    };
    connectWebSocket();

    // Component එකෙන් අයින් වෙද්දී (Unmount) connection එක හරියටම වහනවා
    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const config = await getAuthHeader();

      // 1. Profile එකේ විස්තර ගන්නවා
      try {
        const profileRes = await axios.get(`${BACKEND_URL}/volunteer/profiles/me`, config);
        setProfile(profileRes.data);
      } catch (err: any) {
        // අලුතින්ම රෙජිස්ටර් වුණාම RabbitMQ එකෙන් ප්‍රොෆයිල් එක හැදෙන්න තත්පරයක් දෙකක් යන්න පුළුවන් (404 Error එකක් එයි)
        if (err.response?.status === 404) {
          Alert.alert('Processing', 'ඔබේ ගිණුම සකසමින් පවතී. කරුණාකර ටිකකින් Refresh කරන්න.');
        } else {
          throw err;
        }
      }

      // 2. Assignments (මිෂන්ස්) ටික ගන්නවා
      const assignmentsRes = await axios.get(`${BACKEND_URL}/volunteer/assignments`, config);
      setAssignments(assignmentsRes.data);

    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'ඔබගේ සැසිය අවසන් වී ඇත. කරුණාකර නැවත Login වන්න.');
        handleLogout(); // ඉබේම ලොග් අවුට් කරනවා
      } else {
        console.error(error);
        Alert.alert('Error', 'දත්ත ලබාගැනීමේදී දෝෂයක් ඇතිවිය.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!district) {
      Alert.alert('Error', 'කරුණාකර Base District එක ඇතුලත් කරන්න');
      return;
    }
    try {
      const config = await getAuthHeader();
      await axios.put(
        `${BACKEND_URL}/volunteer/profiles/me`,
        {
          base_district: district,
          city: '', // දැනට හිස්ව යවමු
          available_status: profile?.available_status || false,
          skills: ["cleaning","plumbing","first_aid"] // දැනට default skills යවමු
        },
        config
      );
      Alert.alert('Success', 'Profile එක සාර්ථකව Update විය!');
      fetchDashboardData(); // ආයේ දත්ත ටික අලුත් කරනවා
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Profile update කිරීම අසාර්ථකයි.');
    }
  };

  // Availability ෆන්ක්ෂන් එකේ Error Check එක 422 ට හැදුවා
  const toggleAvailability = async (value: boolean) => {
    try {
      const config = await getAuthHeader();
      await axios.patch(
        `${BACKEND_URL}/volunteer/profiles/me/availability`,
        { available_status: value },
        config
      );
      setProfile({ ...profile, available_status: value });
    } catch (error: any) {
      // මෙන්න මෙතන තමයි 422 අල්ලන්නේ!
      if (error.response?.status === 422) {
        Alert.alert('අවධානයයි!', 'Active වීමට පෙර ඔබගේ ප්‍රදේශය (Base District) තෝරා Save කරන්න.');
      } else {
        console.error(error);
      }
    }
  };

  
 // Assignment ACCEPT function එක
  const handleAccept = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/accept`, {}, config);
      Alert.alert('Success', 'ඔබ මෙය assignment accept කර ඇත! 🚀');
      fetchDashboardData(); // list ko refresh karne ke liye
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 409) {
        Alert.alert('Too Late', 'කණගාටුයි, මෙම කාර්යය දැනටමත් වෙනත් ස්වේච්ඡා සේවකයෙකු විසින් භාරගෙන ඇත (සීමාව සම්පූර්ණයි)..');
      } else {
        Alert.alert('Error', 'Assignment accept problem got.');
      }
    }
  };

  // Assignment DECLINE function එක
  const handleDecline = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/decline`, {}, config);
      Alert.alert('Declined', 'you have declined the assignment.');
      fetchDashboardData(); // refresh the list after declining
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Assignment decline problem got.');
    }
  };




  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_role');
    router.replace('/welcome');
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C851" />
        <Text style={{ marginTop: 10 }}>Loading Dashboard...</Text>
      </View>
    );
  }
  
  // Assignment එක EN-ROUTE (ස්ථානයට යන ගමන්) කිරීම
  const handleEnRoute = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/en-route`, {}, config);
      Alert.alert('On the way!', 'ඔබ ස්ථානයට ගමන් කරන බව යාවත්කාලීන විය. පරිස්සමින් යන්න! 🚶‍♂️');
      fetchDashboardData(); // List එක Refresh කරනවා
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Status යාවත්කාලීන කිරීම අසාර්ථකයි.');
    }
  };

  // Assignment එක COMPLETE (මෙහෙයුම අවසන්) කිරීම
  const handleComplete = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/complete`, {}, config);
      Alert.alert('Mission Accomplished!', 'නියමයි! ඔබ සාර්ථකව මෙහෙයුම අවසන් කළා. ඔබට බොහොම ස්තූතියි! 🏆');
      fetchDashboardData(); // List එක Refresh කරනවා
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Status යාවත්කාලීන කිරීම අසාර්ථකයි.');
    }
  };









  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>ආයුබෝවන්,</Text>
          <Text style={styles.name}>{profile?.full_name || 'Volunteer'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {/* Profile Update Section */}
      <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 }}>
        <Text style={{ marginBottom: 5, fontWeight: 'bold' }}>ඔබගේ ප්‍රදේශය (Base District): {profile?.base_district || 'තාම සකසා නැත'}</Text>
        <TextInput 
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10 }}
          placeholder="උදා: Colombo, Gampaha..."
          value={district}
          onChangeText={setDistrict}
        />
        <Button title="Save District" onPress={updateProfile} color="#33b5e5" />
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusText}>
          {profile?.available_status ? '🟢 ඔබ උදව් කිරීමට සූදානම් (Active)' : '🔴 ඔබ දැනට Offline (Inactive)'}
        </Text>
        <Switch 
          value={profile?.available_status || false} 
          onValueChange={toggleAvailability} 
          trackColor={{ false: "#ff4444", true: "#00C851" }}
        />
      </View>

      {/* Assignments List */}
      <Text style={styles.sectionTitle}>ඔබගේ නව මෙහෙයුම් (Assignments)</Text>
      {assignments.length === 0 ? (
        <Text style={styles.noData}>ඔබට නව මෙහෙයුම් නොමැත.</Text>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} />
          }
          renderItem={({ item }) => (
            <View style={styles.assignmentCard}>
              <Text style={styles.assignmentStatus}>Status: {item.status}</Text>
              <Text style={{ marginBottom: 10 }}>Mission ID: {item.event_id}</Text>
              
              {/* 1. NOTIFIED (අලුතින්ම ආපු එකක් නම්) */}
              {item.status === 'NOTIFIED' && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#ff4444', padding: 10, borderRadius: 5, flex: 0.48, alignItems: 'center' }}
                    onPress={() => handleDecline(item.id)}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Decline</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ backgroundColor: '#00C851', padding: 10, borderRadius: 5, flex: 0.48, alignItems: 'center' }}
                    onPress={() => handleAccept(item.id)}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. ACCEPTED (බාරගත්තට පස්සේ යන ගමන් කියලා දාන්න) */}
              {item.status === 'ACCEPTED' && (
                <TouchableOpacity 
                  style={{ backgroundColor: '#33b5e5', padding: 12, borderRadius: 5, marginTop: 10, alignItems: 'center' }}
                  onPress={() => handleEnRoute(item.id)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>🚶‍♂️ Mark En Route (යන ගමන්)</Text>
                </TouchableOpacity>
              )}

              {/* 3. EN_ROUTE (ස්ථානයට ගියාට පස්සේ වැඩේ ඉවරයි කියලා දාන්න) */}
              {item.status === 'EN_ROUTE' && (
                <TouchableOpacity 
                  style={{ backgroundColor: '#FF8800', padding: 12, borderRadius: 5, marginTop: 10, alignItems: 'center' }}
                  onPress={() => handleComplete(item.id)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>✅ Mark as Complete (අවසන් කළා)</Text>
                </TouchableOpacity>
              )}

              {/* 4. COMPLETED (වැඩේ ඉවර කරපු ඒවා) */}
              {item.status === 'COMPLETED' && (
                 <Text style={{ color: '#007E33', fontWeight: 'bold', marginTop: 10, textAlign: 'center', fontSize: 16 }}>
                   🏆 මෙහෙයුම සාර්ථකව අවසන් කර ඇත!
                 </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 16, color: '#666' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutBtn: { padding: 8, backgroundColor: '#ff4444', borderRadius: 8 },
  logoutText: { color: 'white', fontWeight: 'bold' },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3, marginBottom: 30 },
  statusText: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  noData: { color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  assignmentCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  assignmentStatus: { fontWeight: 'bold', color: '#00C851', marginBottom: 5 }
});