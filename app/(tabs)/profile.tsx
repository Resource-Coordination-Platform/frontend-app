import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const BACKEND_URL = 'http://172.20.10.5:8004/api'; // ඔයාගේ ලැප් එකේ IP එක දාන්න

export default function ProfileScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form States
  const [baseDistrict, setBaseDistrict] = useState('');
  const [city, setCity] = useState('');
  const [skills, setSkills] = useState(''); // අපි මේක comma-separated string එකක් විදිහට තියාගමු
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchProfile = async () => {
    try {
      const config = await getAuthHeader();
      const response = await axios.get(`${BACKEND_URL}/volunteer/profiles/me`, config);
      
      const data = response.data;
      setBaseDistrict(data.base_district || '');
      setCity(data.city || '');
      setIsAvailable(data.available_status === 'AVAILABLE');
      // Skills array එකක් විදිහට එන්නේ, අපි ඒක කමා වලින් වෙන් කරපු string එකක් කරමු Text Input එකට
      if (data.skills && data.skills.length > 0) {
        setSkills(data.skills.join(', '));
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Profile එක ලබා ගැනීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const config = await getAuthHeader();
      
      // Skills string එක ආයේ Array එකක් කරමු
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== '');

      const updateData = {
        base_district: baseDistrict,
        city: city,
        skills: skillsArray,
        available_status: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'
      };

      await axios.put(`${BACKEND_URL}/volunteer/profiles/me`, updateData, config);
      Alert.alert('Success', 'ඔබේ ගිණුම සාර්ථකව යාවත්කාලීන විය! 🚀');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'යාවත්කාලීන කිරීම අසාර්ථකයි.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    router.replace('/login');
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#33b5e5" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>👤 මගේ ගිණුම</Text>

      <View style={styles.card}>
        <Text style={styles.label}>දිස්ත්‍රික්කය (District):</Text>
        <TextInput style={styles.input} value={baseDistrict} onChangeText={setBaseDistrict} placeholder="උදා: Colombo" />

        <Text style={styles.label}>නගරය (City):</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="උදා: Moratuwa" />

        <Text style={styles.label}>ඔබේ හැකියාවන් (Skills):</Text>
        <Text style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>කමා (,) යොදා වෙන් කරන්න</Text>
        <TextInput 
          style={styles.input} 
          value={skills} 
          onChangeText={setSkills} 
          placeholder="උදා: First Aid, Driving, Swimming" 
        />

        <View style={styles.switchContainer}>
          <Text style={styles.label}>දැනට සේවයට සූදානම්ද? (Available)</Text>
          <Switch 
            value={isAvailable} 
            onValueChange={setIsAvailable} 
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isAvailable ? "#33b5e5" : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333', marginTop: 30 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 10, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16, backgroundColor: '#fafafa' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  saveBtn: { backgroundColor: '#33b5e5', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { backgroundColor: '#ff4444', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  logoutBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});