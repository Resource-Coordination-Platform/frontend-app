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
import * as Location from 'expo-location';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
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
  const [locationLoading, setLocationLoading] = useState(false);

  // Form States
  const [category, setCategory] = useState('FLOOD');
  const [severity, setSeverity] = useState('HIGH');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // GPS location ගන්න function එක
  const getGPSLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'අවසර අවශ්‍යයි',
          'ස්ථානය ලබාගැනීමට Location permission එක ලබාදෙන්න.'
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      Alert.alert(
        'ස්ථානය ලැබුණි ✅',
        `ඔබගේ GPS ස්ථානය සාර්ථකව ලබාගන්නා ලදී.\n\nLatitude: ${location.coords.latitude.toFixed(6)}\nLongitude: ${location.coords.longitude.toFixed(6)}`
      );
    } catch (error) {
      Alert.alert('දෝෂයකි', 'GPS ස්ථානය ලබාගැනීමට නොහැකි විය. නැවත උත්සාහ කරන්න.');
    } finally {
      setLocationLoading(false);
    }
  };

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

  // Location සහ image දෙකම ලැබුණාම විතරයි submit button enable වෙන්නේ
  const canSubmit = latitude !== null && longitude !== null && imageUri !== null;

  const submitReport = async () => {
    if (!canSubmit) {
      Alert.alert(
        'අඩුපාඩුයි',
        'කරුණාකර GPS ස්ථානය සහ ඡායාරූපයක් එක් කරන්න. දෙකම අනිවාර්යයි.'
      );
      return;
    }

    setIsLoading(true);
    let uploadedImageUrl = null;

    try {
      // 1. Upload image to Supabase
      if (imageUri) {
        const fileName = `report_${Date.now()}.jpg`;

        // Read the local image file as a blob
        const fileResponse = await fetch(imageUri);
        const blob = await fileResponse.blob();

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/volunteer_reports/${fileName}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY || '',
              'Content-Type': 'image/jpeg',
              'x-upsert': 'true',
            },
            body: blob,
          }
        );

        if (uploadRes.ok) {
          uploadedImageUrl = `${SUPABASE_URL}/storage/v1/object/public/volunteer_reports/${fileName}`;
        } else {
          console.error('Image Upload Failed:', await uploadRes.text());
          Alert.alert('අවවාදයයි', 'පින්තූරය යැවීම අසාර්ථකයි, නමුත් රිපෝට් එක යවනවා.');
        }
      }

      // 2. Send report to backend (latitude/longitude යවනවා district/city වෙනුවට)
      const payload = {
        category: category,
        severity: severity,
        latitude: latitude,
        longitude: longitude,
        description: description.trim() || 'No description provided.',
        image_url: uploadedImageUrl,
      };

      await api.post('/volunteer/reports', payload);

      Alert.alert('Success!', 'ඔබේ වාර්තාව සාර්ථකව යොමු කළා. ආසන්නතම සහන මධ්‍යස්ථානයට ස්වයංක්‍රීයව යොමු කරා! 🏆');

      // Clear the form
      setLatitude(null);
      setLongitude(null);
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

            {/* GPS Location Button */}
            <Text style={styles.sectionLabel}>ස්ථානය (Location) *</Text>
            <Text style={styles.locationHint}>
              සිද්ධිය සිදුවන ආසන්නතම ප්‍රදේශයකින් ඔබේ ස්ථානය ලබා දෙන්න
            </Text>

            {latitude !== null && longitude !== null ? (
              <View style={styles.locationSuccessBox}>
                <View style={styles.locationSuccessHeader}>
                  <View style={styles.locationCheckCircle}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.locationSuccessTitle}>ස්ථානය ලබා ගැනුණි ✅</Text>
                </View>
                <View style={styles.coordsRow}>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Latitude</Text>
                    <Text style={styles.coordValue}>{latitude.toFixed(6)}</Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Longitude</Text>
                    <Text style={styles.coordValue}>{longitude.toFixed(6)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.relocateBtn}
                  onPress={getGPSLocation}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="my-location" size={14} color="#00897B" />
                  <Text style={styles.relocateBtnText}>නැවත ස්ථානය ලබාගන්න</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={getGPSLocation}
                activeOpacity={0.85}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator color="#00897B" size="small" />
                ) : (
                  <>
                    <View style={styles.locationIconCircle}>
                      <MaterialIcons name="my-location" size={22} color="#00897B" />
                    </View>
                    <View>
                      <Text style={styles.locationBtnTitle}>
                        ස්ථානය ලබාදෙන්න
                      </Text>
                      <Text style={styles.locationBtnSub}>
                        GPS මඟින් ඔබේ ස්ථානය ස්වයංක්‍රීයව ලබා ගැනේ
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )}

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

            {/* Image Attachment Box (අනිවාර්යයි) */}
            <Text style={styles.sectionLabel}>ඡායාරූපයක් එක් කරන්න (Required) *</Text>
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

            {/* Readiness Indicator */}
            {!canSubmit && (
              <View style={styles.readinessBox}>
                <MaterialIcons name="info-outline" size={16} color="#D97706" />
                <Text style={styles.readinessText}>
                  {latitude === null && imageUri === null
                    ? 'GPS ස්ථානය සහ ඡායාරූපය අනිවාර්යයි'
                    : latitude === null
                    ? 'GPS ස්ථානය ලබාදිය යුතුයි'
                    : 'ඡායාරූපයක් එක් කළ යුතුයි'}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!canSubmit || isLoading) && styles.submitBtnDisabled,
              ]}
              onPress={submitReport}
              disabled={!canSubmit || isLoading}
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

  /* --- GPS Location Button --- */
  locationHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 16,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#B2DFDB',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  locationIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00897B',
  },
  locationBtnSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* --- Location Success --- */
  locationSuccessBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
  },
  locationSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  locationCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSuccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  coordItem: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 8,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  relocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  relocateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00897B',
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

  /* --- Readiness Indicator --- */
  readinessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  readinessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
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
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});