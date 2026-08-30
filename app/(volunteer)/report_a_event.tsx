import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const DISASTER_CATEGORIES = [
  { id: 'FLOOD', label: 'ගංවතුර (Flood)', icon: 'water' },
  { id: 'FIRE', label: 'ගිනිගැනීම් (Fire)', icon: 'fire' },
  { id: 'LANDSLIDE', label: 'නායයෑම් (Landslide)', icon: 'mountain' },
  { id: 'STORM', label: 'දැඩි සුළං (Storm)', icon: 'wind' },
  { id: 'OTHER', label: 'වෙනත් (Other)', icon: 'ellipsis-h' },
];

const SEVERITY_LEVELS = [
  { id: 'CRITICAL', label: 'Critical', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
  { id: 'HIGH', label: 'High', color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
  { id: 'MEDIUM', label: 'Medium', color: '#D97706', bgColor: '#FFFBEB', borderColor: '#FEF3C7' },
  { id: 'LOW', label: 'Low', color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
];

export default function ReportEventScreen() {
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [category, setCategory] = useState('FLOOD');
  const [severity, setSeverity] = useState('HIGH');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('අවසර අවශ්‍යයි', 'පින්තූර තෝරාගැනීමට Gallery එක සඳහා අවසර ලබාදෙන්න.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submitReport = async () => {
    if (!district.trim() || !city.trim()) {
      Alert.alert('අඩුපාඩුයි', 'කරුණාකර දිස්ත්‍රික්කය සහ නගරය ඇතුළත් කරන්න.');
      return;
    }

    setIsLoading(true);
    let uploadedImageUrl = null;

    try {
      // 1. Upload image to Supabase if present
      if (imageUri) {
        const fileName = `report_${Date.now()}.jpg`;
        const formData = new FormData();

        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/volunteer_reports/${fileName}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY || '',
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          }
        );

        if (uploadRes.ok) {
          uploadedImageUrl = `${SUPABASE_URL}/storage/v1/object/public/volunteer_reports/${fileName}`;
        } else {
          console.error('Image Upload Failed:', await uploadRes.text());
          Alert.alert('අවවාදයයි', 'පින්තූරය යැවීම අසාර්ථකයි, නමුත් රිපෝට් එක යවනවා.');
        }
      }

      // 2. Send report to backend
      const payload = {
        category: category,
        severity: severity,
        district: district.trim(),
        city: city.trim(),
        description: description.trim() || 'No description provided.',
        image_url: uploadedImageUrl,
      };

      await api.post('/volunteer/reports', payload);

      Alert.alert('Success!', 'ඔබේ වාර්තාව සාර්ථකව යොමු කළා. සහන කණ්ඩායම් මෙය ඉක්මනින් පරීක්ෂා කරාවි! 🏆');

      // Clear the form
      setDistrict('');
      setCity('');
      setDescription('');
      setImageUri(null);
    } catch (error: any) {
      if (error.response) {
        console.error('Report Error:', JSON.stringify(error.response.data, null, 2));
      }
      Alert.alert('Error', 'වාර්තා කිරීම අසාර්ථකයි.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Header --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}> ආපදාවක් වාර්තා කරන්න</Text>
              <Text style={styles.headerSubtitle}>
                ඔබ දුටු හෝ දැනුවත් වූ ආපදා තොරතුරු කඩිනමින් යොමු කරන්න
              </Text>
            </View>
            <View style={styles.headerIconCircle}>
              <MaterialIcons name="add-alert" size={20} color="#80CBC4" />
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Form Card */}
          <View style={styles.formCard}>
            {/* Category Selector */}
            <Text style={styles.sectionLabel}>ආපදා වර්ගය (Category) *</Text>
            <View style={styles.categoriesGrid}>
              {DISASTER_CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <FontAwesome5
                      name={cat.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : '#00897B'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Selector */}
            <Text style={styles.sectionLabel}>භයානකකම (Severity Level) *</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map(sev => {
                const isSelected = severity === sev.id;
                return (
                  <TouchableOpacity
                    key={sev.id}
                    style={[
                      styles.severityChip,
                      {
                        backgroundColor: isSelected ? sev.color : sev.bgColor,
                        borderColor: sev.borderColor,
                      },
                    ]}
                    onPress={() => setSeverity(sev.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.severityChipText,
                        { color: isSelected ? '#FFFFFF' : sev.color },
                      ]}
                    >
                      {sev.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location Inputs */}
            <Text style={styles.sectionLabel}>දිස්ත්‍රික්කය (District) *</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="location-city" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={district}
                onChangeText={setDistrict}
                placeholder="උදා: Galle, Kalutara, Ratnapura"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <Text style={styles.sectionLabel}>ආසන්න නගරය (City) *</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="map" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="උදා: Baddegama, Horana"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Description Input */}
            <Text style={styles.sectionLabel}>විස්තරය (Description)</Text>
            <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 10 }]}>
              <MaterialIcons name="notes" size={20} color="#64748B" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="සිදුවී ඇති ආපදාවේ තත්ත්වය, අවහිරතා හෝ අවශ්‍යතා ගැන කෙටියෙන් ලියන්න..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>

            {/* Image Attachment Box */}
            <Text style={styles.sectionLabel}>ඡායාරූපයක් එක් කරන්න (Optional)</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="cancel" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerDashedBox}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <View style={styles.cameraIconCircle}>
                  <FontAwesome5 name="camera" size={18} color="#00897B" />
                </View>
                <Text style={styles.imagePickerText}>Gallery එකෙන් ඡායාරූපයක් තෝරන්න</Text>
                <Text style={styles.imagePickerSub}>JPG හෝ PNG (උපරිම 5MB)</Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
              onPress={submitReport}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome5 name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>වාර්තාව යොමු කරන්න (Submit Report)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#041F1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* --- Header --- */
  header: {
    backgroundColor: '#041F1A',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 12,
    paddingBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B2DFDB',
    marginTop: 3,
    fontWeight: '500',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 137, 123, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- Form Container --- */
  scrollContent: {
    padding: 16,
    paddingBottom: 35,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    marginTop: 14,
  },

  /* --- Category Picker --- */
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#B2DFDB',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  categoryChipSelected: {
    backgroundColor: '#00897B',
    borderColor: '#00796B',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00695C',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },

  /* --- Severity Row --- */
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* --- Inputs --- */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
  },

  /* --- Image Picker --- */
  imagePickerDashedBox: {
    borderWidth: 1.5,
    borderColor: '#B2DFDB',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cameraIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00897B',
  },
  imagePickerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },

  /* --- Submit Button --- */
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00897B',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 22,
    elevation: 3,
    shadowColor: '#00897B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});