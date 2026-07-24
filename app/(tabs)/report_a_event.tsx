import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


const BACKEND_URL = 'http://172.20.10.5:8004/api'; // ඔයාගේ ලැප් එකේ IP එක දාන්න

export default function ReportEventScreen() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [category, setCategory] = useState('FLOOD');
  const [severity, setSeverity] = useState('HIGH');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  const submitReport = async () => {
    if (!district || !city) {
      Alert.alert('අඩුපාඩුයි', 'කරුණාකර දිස්ත්‍රික්කය සහ නගරය ඇතුළත් කරන්න.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const payload = {
        category: category,
        severity: severity,
        district: district,
        city: city,
        status: "DECLARED", // අලුතින් දාන ඒවා DECLARED විදිහට තමයි යන්නේ
        description: description || "No description provided."
      };

      await axios.post(`${BACKEND_URL}/volunteer/events`, payload, config);
      
      Alert.alert('Success!', 'ආපදා තත්ත්වය සාර්ථකව වාර්තා කළා. ස්තූතියි! 🏆');
      
      // Form එක Clear කරනවා
      setDistrict('');
      setCity('');
      setDescription('');
      
    } catch (error: any) {
      if (error.response) {
        console.error("Report Error:", JSON.stringify(error.response.data, null, 2));
      }
      Alert.alert('Error', 'වාර්තා කිරීම අසාර්ථකයි.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>🚨 ආපදාවක් වාර්තා කරන්න</Text>

      <View style={styles.card}>
        <Text style={styles.label}>ආපදා වර්ගය (Category):</Text>
        <View style={styles.row}>
          {['FLOOD', 'FIRE', 'LANDSLIDE'].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={{ color: category === cat ? 'white' : '#333', fontWeight: 'bold' }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>භයානකකම (Severity):</Text>
        <View style={styles.row}>
          {['MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => (
            <TouchableOpacity 
              key={sev} 
              style={[
                styles.chip, 
                severity === sev && { backgroundColor: sev === 'CRITICAL' ? '#CC0000' : sev === 'HIGH' ? '#ff4444' : '#FF8800' }
              ]}
              onPress={() => setSeverity(sev)}
            >
              <Text style={{ color: severity === sev ? 'white' : '#333', fontWeight: 'bold' }}>
                {sev}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>දිස්ත්‍රික්කය (District):</Text>
        <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="උදා: Galle" />

        <Text style={styles.label}>නගරය (City):</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="උදා: Ambalangoda" />

        <Text style={styles.label}>විස්තරය (Description):</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={description} 
          onChangeText={setDescription} 
          placeholder="සිදුවීම ගැන කෙටියෙන් ලියන්න..." 
          multiline 
        />

        <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>📤 වාර්තා කරන්න</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#CC0000', marginTop: 30 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3, marginBottom: 40 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 15, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, fontSize: 16, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#33b5e5', borderColor: '#33b5e5' },
  submitBtn: { backgroundColor: '#CC0000', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 25 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});