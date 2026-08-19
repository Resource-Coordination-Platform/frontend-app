import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';


//this for upload image to supabase bucket
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ;


export default function ReportEventScreen() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [category, setCategory] = useState('FLOOD');
  const [severity, setSeverity] = useState('HIGH');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // pick image function as a key arrow function representaion
  const pickImage = async () => {
    // asking permission to go to gallery
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('අවසර අවශ්‍යයි', 'පින්තූර තෝරාගැනීමට Gallery එක සඳහා අවසර ලබාදෙන්න.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // This use for optimizing.because when reduce quality in half it fast upload to supabase
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submitReport = async () => {
    if (!district || !city) {
      Alert.alert('අඩුපාඩුයි', 'කරුණාකර දිස්ත්‍රික්කය සහ නගරය ඇතුළත් කරන්න.');
      return;
    }

    setIsLoading(true);
    let uploadedImageUrl = null;

    try {
      // 1.if there is a image,upload to supabase
      if (imageUri) {
        const fileName = `report_${Date.now()}.jpg`;
        const formData = new FormData();
        
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/volunteer_reports/${fileName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        if (uploadRes.ok) {
          // image url that save in supabase table too
          uploadedImageUrl = `${SUPABASE_URL}/storage/v1/object/public/volunteer_reports/${fileName}`;
        } else {
          console.error("Image Upload Failed:", await uploadRes.text());
          Alert.alert('අවවාදයයි', 'පින්තූරය යැවීම අසාර්ථකයි, නමුත් රිපෝට් එක යවනවා.');
        }
      }

      // 2.send report to backend
      const token = await SecureStore.getItemAsync('access_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const payload = {
        category: category,
        severity: severity,
        district: district,
        city: city,
        description: description || "No description provided.",
        image_url: uploadedImageUrl // so send image url also for he table
      };

      await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/volunteer/reports`, payload, config);
      
      Alert.alert('Success!', 'ඔබේ වාර්තාව සාර්ථකව යොමු කළා. කණ්ඩායම මෙය ඉක්මනින් පරීක්ෂා කරාවි! 🏆');
      
      // clear the form by set states to ""
      setDistrict('');
      setCity('');
      setDescription('');
      setImageUri(null);
      
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

        <Text style={styles.label}>ඡායාරූපයක් එක් කරන්න (අනිවාර්ය නැත):</Text>
        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
          <Ionicons name="camera" size={24} color="#555" />
          <Text style={styles.imagePickerText}>පින්තූරයක් තෝරන්න</Text>
        </TouchableOpacity>

        {imageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
        )}

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
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', justifyContent: 'center' },
  imagePickerText: { marginLeft: 10, color: '#555', fontWeight: 'bold' },
  imagePreviewContainer: { marginTop: 15, position: 'relative', alignSelf: 'flex-start' },
  imagePreview: { width: 100, height: 100, borderRadius: 8 },
  removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: 'white', borderRadius: 12 }
});