import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { MaterialIcons } from '@expo/vector-icons';
import { saveAuthTokens } from '../services/api';
import { validateEmail, formatAuthError, EMAIL_REGEX } from '../utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailTouched) {
      const res = validateEmail(text);
      setEmailError(res.isValid ? '' : (res.error || ''));
    }
  };

  const handleLogin = async () => {
    setEmailTouched(true);
    const emailRes = validateEmail(email);
    setEmailError(emailRes.isValid ? '' : (emailRes.error || ''));

    if (!password) {
      setPasswordError('මුරපදය ඇතුළත් කරන්න');
    } else {
      setPasswordError('');
    }

    if (!emailRes.isValid || !password) {
      Alert.alert('දෝෂයකි (Error)', emailRes.error || 'කරුණාකර මුරපදය ඇතුළත් කරන්න.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/login`, {
        email: cleanEmail,
        password: password
      });

      const { access_token, refresh_token, tenant_id } = res.data;
      const decodedToken: any = jwtDecode(access_token);
      const role = decodedToken.user_type;
      if (!['VICTIM', 'VOLUNTEER', 'GRAMA_NILADHARI'].includes(role)) throw new Error('This account cannot access the mobile app.');

      await saveAuthTokens({
        accessToken: access_token,
        refreshToken: refresh_token,
        userRole: role,
        tenantId: tenant_id,
      });
      
      if (role === 'GRAMA_NILADHARI') {
        router.replace('/grama-niladhari');
      } else if (role === 'VICTIM') {
        router.replace('/victim');
      } else {
        router.replace('/volunteer');
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = formatAuthError(error, 'Email හෝ Password වැරදියි.');
      Alert.alert('ඇතුල්වීම අසාර්ථකයි (Login Failed)', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailValidFormat = EMAIL_REGEX.test(email.trim());

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
            {/* Email Field */}
            <View style={[
              styles.inputContainer,
              emailError ? styles.inputContainerError : (isEmailValidFormat ? styles.inputContainerSuccess : null)
            ]}>
              <MaterialIcons name="email" size={20} color={emailError ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="ඊමේල් (Email / Gmail)" 
                value={email} 
                onChangeText={handleEmailChange} 
                onBlur={() => {
                  setEmailTouched(true);
                  const res = validateEmail(email);
                  setEmailError(res.isValid ? '' : (res.error || ''));
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
              />
              {isEmailValidFormat && (
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
              )}
              {emailError ? (
                <MaterialIcons name="error-outline" size={18} color="#EF4444" />
              ) : null}
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            
            {/* Password Field */}
            <View style={[
              styles.inputContainer,
              passwordError ? styles.inputContainerError : null
            ]}>
              <MaterialIcons name="lock" size={20} color={passwordError ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="මුරපදය (Password)" 
                value={password} 
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError && text) setPasswordError('');
                }} 
                secureTextEntry={!showPassword}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

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
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 14, paddingHorizontal: 15 },
  inputContainerError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputContainerSuccess: { borderColor: '#10B981' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1F2937' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -10, marginBottom: 12, marginLeft: 4, fontWeight: '500' },
  button: { backgroundColor: '#3B82F6', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 25, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' }
});