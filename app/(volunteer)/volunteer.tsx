import { useEffect, useState } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl,TextInput,Modal } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; ///meken thamai icon eka da ganne profile button ekata

const BACKEND_URL = 'http://172.22.192.42:8004/api';

export default function VolunteerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [editDistrict, setEditDistrict] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const SRI_LANKAN_SKILLS = [
  { value: 'first_aid', label: 'First Aid' },
  { value: 'search_&_rescue', label: 'Search & Rescue' },
  { value: 'debris_clearing', label: 'Debris Clearing' },
  { value: 'food_distribution', label: 'Food Distribution' },
  { value: 'medical_assistance', label: 'Medical Assistance' },
  { value: 'driving_transport', label: 'Driving/Transport' },
  { value: 'boat_operating', label: 'Boat Operating' },
  { value: 'coordination', label: 'Coordination' },
];


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
      let currentProfile = null;

      // 1. Profile එකේ විස්තර ගන්නවා
      try {
        const profileRes = await axios.get(`${BACKEND_URL}/volunteer/profiles/me`, config);
        currentProfile = profileRes.data;
        setProfile(currentProfile);

        // 🚨 අලුත් Volunteer කෙනෙක් නම් Profile Modal එක ඕපන් කරනවා
        if (!currentProfile.base_district) {
          Alert.alert('සාදරයෙන් පිළිගනිමු!', 'මෙහෙයුම් ලබා ගැනීමට පෙර කරුණාකර ඔබගේ ගිණුමේ විස්තර සම්පූර්ණ කරන්න.');
          setIsProfileModalVisible(true); // වෙන පේජ් එකකට යන්නෙ නෑ, Popup එක එනවා!
          return;
        }

      } catch (err: any) {
        if (err.response?.status === 404) {
          Alert.alert('Processing', 'ඔබේ ගිණුම සකසමින් පවතී. කරුණාකර ටිකකින් Refresh කරන්න.');
          return;
        } else {
          throw err;
        }
      }

      // 2. Profile එක සම්පූර්ණ නම් විතරක් Assignments ටික ගන්නවා
      if (currentProfile && currentProfile.base_district) {
        const assignmentsRes = await axios.get(`${BACKEND_URL}/volunteer/assignments`, config);
        setAssignments(assignmentsRes.data);
      }

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
    }
  };

  const toggleSkill = (skill: string) => {
    if (editSkills.includes(skill)) {
      // දැනටමත් තෝරලා නම් අයින් කරනවා (Deselect)
      setEditSkills(editSkills.filter(s => s !== skill));
    } else {
      // අලුතින් තෝරනවා නම් ඇඩ් කරනවා
      setEditSkills([...editSkills, skill]);
    }
  };


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
      if (error.response?.status === 422) {
        Alert.alert('අවධානයයි!', 'Active වීමට පෙර ඔබගේ ප්‍රදේශය (Base District) තෝරා Save කරන්න.');
      } else {
        console.error(error);
      }
    }
  };

  // Assignment ACCEPT function
  const handleAccept = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/accept`, {}, config);
      Alert.alert('Success', 'ඔබ මෙය assignment accept කර ඇත! 🚀');
      fetchDashboardData(); 
    } catch (error: any) {
      if (error.response?.status === 409) {
        Alert.alert('Too Late', 'කණගාටුයි, මෙම කාර්යය දැනටමත් වෙනත් ස්වේච්ඡා සේවකයෙකු විසින් භාරගෙන ඇත (සීමාව සම්පූර්ණයි)..');
      } else {
        Alert.alert('Error', 'Assignment accept problem got.');
      }
    }
  };

  // Assignment DECLINE function
  const handleDecline = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/decline`, {}, config);
      Alert.alert('Declined', 'You have declined the assignment.');
      fetchDashboardData(); 
    } catch (error) {
      Alert.alert('Error', 'Assignment decline problem got.');
    }
  };

  // Assignment EN-ROUTE function
  const handleEnRoute = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/en-route`, {}, config);
      Alert.alert('On the way!', 'ඔබ ස්ථානයට ගමන් කරන බව යාවත්කාලීන විය. පරිස්සමින් යන්න! 🚶‍♂️');
      fetchDashboardData(); 
    } catch (error) {
      Alert.alert('Error', 'Status යාවත්කාලීන කිරීම අසාර්ථකයි.');
    }
  };

  // Assignment COMPLETE function
  const handleComplete = async (assignmentId: string) => {
    try {
      const config = await getAuthHeader();
      await axios.post(`${BACKEND_URL}/volunteer/assignments/${assignmentId}/complete`, {}, config);
      Alert.alert('Mission Accomplished!', 'නියමයි! ඔබ සාර්ථකව මෙහෙයුම අවසන් කළා. ඔබට බොහොම ස්තූතියි! 🏆');
      fetchDashboardData(); 
    } catch (error) {
      Alert.alert('Error', 'Status යාවත්කාලීන කිරීම අසාර්ථකයි.');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_role');
    router.replace('/welcome');
  };

  const saveProfile = async () => {
    if (!editDistrict || !editCity || !editSkills) {
      Alert.alert('අඩුපාඩුයි', 'කරුණාකර දිස්ත්‍රික්කය සහ නගරය ,skills ඇතුලත් කරන්න.');
      return;
    }
    setIsSaving(true);
    try {

      const config = await getAuthHeader();
      await axios.put(
        `${BACKEND_URL}/volunteer/profiles/me`,
        {
          base_district: editDistrict,
          city: editCity,
          available_status: profile?.available_status || false,
          skills: editSkills ,
        },
        config
      );
      Alert.alert('Success', 'Profile එක සාර්ථකව Update විය!');
      setIsProfileModalVisible(false); // Modal එක වහනවා
      fetchDashboardData(); // Dashboard එක රිෆ්‍රෙෂ් කරනවා
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Profile update කිරීම අසාර්ථකයි.');
    } finally {
      setIsSaving(false);
    }
  };
  const VALID_SKILL_VALUES = SRI_LANKAN_SKILLS.map(s => s.value); // 8 skill values ටිකම



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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          
          {/* අලුතින් දාපු Profile Icon Button එක */}
          <TouchableOpacity 
            style={{ marginRight: 15 }} 
            

            onPress={() => {
            
              setEditDistrict(profile?.base_district || '');
              setEditCity(profile?.city || '');
              setEditSkills(
                (profile?.skills || []).filter((s: string) => VALID_SKILL_VALUES.includes(s))
              );
              setIsProfileModalVisible(true);
            }}
          >
            <Ionicons name="person-circle" size={36} color="#33b5e5" />
          </TouchableOpacity>

          {/* කලින් තිබ්බ Logout Button එක */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          
        </View>
      </View>


      {/* Status Card (Availability Switch) */}
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
        <Text style={styles.noData}>ඔබට දැනට නව මෙහෙයුම් නොමැත.</Text>
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

              {item.status === 'ACCEPTED' && (
                <TouchableOpacity 
                  style={{ backgroundColor: '#33b5e5', padding: 12, borderRadius: 5, marginTop: 10, alignItems: 'center' }}
                  onPress={() => handleEnRoute(item.id)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>🚶‍♂️ Mark En Route (යන ගමන්)</Text>
                </TouchableOpacity>
              )}

              {item.status === 'EN_ROUTE' && (
                <TouchableOpacity 
                  style={{ backgroundColor: '#FF8800', padding: 12, borderRadius: 5, marginTop: 10, alignItems: 'center' }}
                  onPress={() => handleComplete(item.id)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>✅ Mark as Complete (අවසන් කළා)</Text>
                </TouchableOpacity>
              )}

              {item.status === 'COMPLETED' && (
                 <Text style={{ color: '#007E33', fontWeight: 'bold', marginTop: 10, textAlign: 'center', fontSize: 16 }}>
                   🏆 මෙහෙයුම සාර්ථකව අවසන් කර ඇත!
                 </Text>
              )}
            </View>
          )}
        />
      )}



      {/* Profile Modal / Popup Card */}
      <Modal visible={isProfileModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>👤 මගේ ගිණුම</Text>
            
            <Text style={styles.label}>දිස්ත්‍රික්කය (District):</Text>
            <TextInput style={styles.input} value={editDistrict} onChangeText={setEditDistrict} placeholder="උදා: Colombo" />

            <Text style={styles.label}>නගරය (City):</Text>
            <TextInput style={styles.input} value={editCity} onChangeText={setEditCity} placeholder="උදා: Moratuwa" />

            
            <Text style={styles.label}>ඔබේ හැකියාවන් (Select කරන්න):</Text>
            <View style={styles.skillsContainer}>
              {SRI_LANKAN_SKILLS.map((skill) => {
                const isSelected = editSkills.includes(skill.value);
                return (
                  <TouchableOpacity
                    key={skill.value}
                    style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                    onPress={() => toggleSkill(skill.value)}
                  >
                    <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>
                      {skill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={isSaving}>
              <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Details'}</Text>
            </TouchableOpacity>

            {/* දැනටමත් දිස්ත්‍රික්කයක් තියෙන කෙනෙක්ට විතරක් Modal එක වහන්න (Cancel) දෙන්න. අලුත් කෙනෙක් නම් අනිවාර්යයෙන් Save කරන්නම ඕනේ */}
            {profile?.base_district && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsProfileModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>




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
  profileBtn:{padding: 8, backgroundColor: '#6c2dc5', borderRadius: 80},
  logoutText: { color: 'white', fontWeight: 'bold' },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3, marginBottom: 30 },
  statusText: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  noData: { color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  assignmentCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  assignmentStatus: { fontWeight: 'bold', color: '#00C851', marginBottom: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginTop: 10, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, fontSize: 16, backgroundColor: '#fafafa', marginBottom: 10 },
  saveBtn: { backgroundColor: '#33b5e5', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 15, alignItems: 'center' },
  cancelBtnText: { color: '#ff4444', fontWeight: 'bold', fontSize: 16 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5, marginBottom: 15 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  skillChipSelected: { backgroundColor: '#33b5e5', borderColor: '#33b5e5' },
  skillText: { color: '#555', fontSize: 13, fontWeight: 'bold' },
  skillTextSelected: { color: 'white' },
});