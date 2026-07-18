import { useEffect, useState } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Button,TextInput } from 'react-native';
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

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'දත්ත ලබාගැනීමේදී දෝෂයක් ඇතිවිය.');
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
        Alert.alert('Too Late', 'Maaf kijiye, yeh mission kisi aur volunteer ne accept kar liya hai (Quota Full).');
      } else {
        Alert.alert('Error', 'Assignment accept karne mein problem aayi.');
      }
    }
  };

  // Assignment DECLINE function එක
  const handleDecline = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/decline`, {}, config);
      Alert.alert('Declined', 'Aapne assignment decline kar diya hai.');
      fetchDashboardData(); // List ko refresh karne ke liye
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Assignment decline karne mein problem aayi.');
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
          renderItem={({ item }) => (
            <View style={styles.assignmentCard}>
              <Text style={styles.assignmentStatus}>Status: {item.status}</Text>
              <Text style={{ marginBottom: 10 }}>Mission ID: {item.event_id}</Text>
              
              {/* NOTIFIED status par Accept/Decline buttons */}
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

              {/* ACCEPTED status message */}
              {item.status === 'ACCEPTED' && (
                 <Text style={{ color: 'blue', fontWeight: 'bold', marginTop: 10 }}>ඔබ මෙම මෙහෙයුම භාරගෙන ඇත! කරුණාකර ලබා දී ඇති ස්ථානය වෙත යන්න.</Text>
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