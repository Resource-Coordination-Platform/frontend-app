import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const BACKEND_URL = 'http://172.22.192.42:8001/api';   

export default function RegisterHelper() {
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
      await axios.post(`${BACKEND_URL}/auth/register`, {
        email: email, password: password, full_name: fullName, phone: phone, user_type: 'VOLUNTEER'
      });

      const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, { email: email, password: password });
      const accessToken = loginResponse.data.access_token;

      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('user_role', 'volunteer');

      router.replace('/volunteer');

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
              <FontAwesome5 name="hands-helping" size={40} color="#00897B" />
            </View>
            <Text style={styles.title}>මට උදව් කළ හැක</Text>
            <Text style={styles.subtitle}>ස්වේච්ඡා සේවකයෙකු ලෙස එක්වන්න.</Text>
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
              <ActivityIndicator size="large" color="#00897B" style={{ marginTop: 20 }} />
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
  iconCircle: { width: 80, height: 80, backgroundColor: '#E0F2F1', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  title: { fontSize: 28, fontWeight: '900', color: '#1F2937', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1F2937' },
  button: { backgroundColor: '#00897B', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 25, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' }
});