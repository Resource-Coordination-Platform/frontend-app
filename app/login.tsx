import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { MaterialIcons } from '@expo/vector-icons';

const BACKEND_URL = 'http://172.22.192.42:8001/api';  

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email සහ Password ඇතුළත් කරන්න.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: email,
        password: password
      });

      await SecureStore.setItemAsync('access_token', res.data.access_token);
      const decodedToken: any = jwtDecode(res.data.access_token);
      
      if (decodedToken.user_type === 'VICTIM') {
        await SecureStore.setItemAsync('user_role', 'VICTIM');
        router.replace('/victim');
      } else if (decodedToken.user_type === 'VOLUNTEER') {
        await SecureStore.setItemAsync('user_role', 'VOLUNTEER'); 
        router.replace('/volunteer');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Login Failed', 'Email හෝ Password වැරදියි.');
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
              <MaterialIcons name="lock-person" size={50} color="#3B82F6" />
            </View>
            <Text style={styles.title}>යළි පිවිසෙන්න</Text>
            <Text style={styles.subtitle}>ඔබගේ ගිණුමට ඇතුළු වීමට විස්තර ලබා දෙන්න.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="ඊමේල් (Email)" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="මුරපදය (Password)" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
                <Text style={styles.buttonText}>ඇතුල් වන්න (Login)</Text>
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
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 80, height: 80, backgroundColor: '#DBEAFE', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  title: { fontSize: 28, fontWeight: '900', color: '#1F2937', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1F2937' },
  button: { backgroundColor: '#3B82F6', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 25, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' }
});