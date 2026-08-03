import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import axios from 'axios';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const BACKEND_URL = 'http://172.22.192.42:8001/api'; 

export default function RegisterVictim() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'කරුණාකර සියලුම තොරතුරු ඇතුලත් කරන්න.');
      return;
    }

    setIsLoading(true);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('අවධානයයි', 'ලියාපදිංචි වීමට ඔබගේ ස්ථානය (Location) ලබා දීම අනිවාර්ය වේ.');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      await axios.post(`${BACKEND_URL}/auth/register`, {
        email: email, password: password, full_name: fullName, phone: phone, user_type: 'VICTIM', latitude: lat, longitude: lng
      });

      const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, { email: email, password: password });
      const accessToken = loginResponse.data.access_token;
      const tenantId = loginResponse.data.tenant_id; 

      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('user_role', 'victim');
      if (tenantId) await SecureStore.setItemAsync('tenant_id', tenantId);

      router.replace('/victim');

    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || 'Registration failed. කරුණාකර නැවත උත්සහ කරන්න.';
      Alert.alert('Error', errorMsg);
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
  header: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { width: 80, height: 80, backgroundColor: '#FFEBEE', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  title: { fontSize: 28, fontWeight: '900', color: '#1F2937', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1F2937' },
  button: { backgroundColor: '#E53935', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 25, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' }
});