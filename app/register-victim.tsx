import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { saveAuthTokens } from '../services/api';

export default function RegisterVictim() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigateToOfflineSos = () => {
    router.push('/offline-sos');
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'කරුණාකර සියලුම තොරතුරු ඇතුලත් කරන්න.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
        setIsLoading(false);
        Alert.alert(
          'සංඥා නොමැත (No Signal)',
          'ඔබට මේ මොහොතේ අන්තර්ජාල සම්බන්ධතාවයක් නොමැත. කරුණාකර හදිසි ආධාර ලබා ගැනීම සඳහා නොබැඳි මාදිලියට (Offline SOS Mode) පිවිසෙන්න.',
          [
            {
              text: 'නැත',
              style: 'cancel'
            },
            {
              text: 'Offline SOS වෙත යන්න',
              style: 'default',
              onPress: navigateToOfflineSos //router.push(offline.sos)
            }
          ]
        );
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('අවධානයයි', 'ලියාපදිංචි වීමට ඔබගේ ස්ථානය (Location) ලබා දීම අනිවාර්ය වේ.');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/register`, {
        email: email, password: password, full_name: fullName, phone: phone, user_type: 'VICTIM', latitude: lat, longitude: lng
      });

      const loginResponse = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/login`, { email: email, password: password });
      const { access_token, refresh_token, tenant_id } = loginResponse.data;

      await saveAuthTokens({
        accessToken: access_token,
        refreshToken: refresh_token,
        userRole: 'VICTIM',
        tenantId: tenant_id,
      });

      router.replace('/victim');

    } catch (error: any) {
      console.error(error);
      const isNetworkErr = !error.response || error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network');
      
      if (isNetworkErr) {
        Alert.alert(
          'සංඥා නොමැත (Network Error)',
          'සර්වර් එක සම්බන්ධ කරගත නොහැක. ඔබගේ හදිසි ආධාර ඉල්ලීම Offline SOS Mode හරහා යොමු කළ හැක.',
          [
            { text: 'නැවත උත්සාහ කරන්න', style: 'cancel' },
            { 
              text: 'Offline SOS වෙත යන්න', 
              onPress: navigateToOfflineSos 
            }
          ]
        );
      } else {
        const errorMsg = error.response?.data?.detail || 'Registration failed. කරුණාකර නැවත උත්සහ කරන්න.';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="life-ring" size={40} color="#E53935" />
            </View>
            <Text style={styles.title}>මට උදව් අවශ්‍යයි</Text>
            <Text style={styles.subtitle}>ඔබගේ තොරතුරු ලබා දී ලියාපදිංචි වන්න.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="සම්පූර්ණ නම" value={fullName} onChangeText={setFullName} placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="ඊමේල් (Email)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="දුරකථන අංකය" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="මුරපදය (Password)" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#9CA3AF" />
            </View>

            {isLoading ? (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <ActivityIndicator size="large" color="#E53935" />
                <Text style={{ marginTop: 10, color: '#6B7280', fontSize: 12 }}>ස්ථානය හඳුනාගනිමින් පවතී...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.8}>
                <Text style={styles.buttonText}>ලියාපදිංචි වන්න (Register)</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>පසුපසට</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  header: { alignItems: 'center', marginBottom: 25 },
  iconCircle: { width: 80, height: 80, backgroundColor: '#FFEBEE', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  title: { fontSize: 28, fontWeight: '900', color: '#1F2937', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1F2937' },
  button: { backgroundColor: '#E53935', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  offlineBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    elevation: 1,
  },
  offlineBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  offlineBannerSub: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 2,
  },
  backBtn: { marginTop: 15, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' }
});