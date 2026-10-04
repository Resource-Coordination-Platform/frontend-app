import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { saveAuthTokens } from '../services/api';
import { validateEmail, validatePassword, validateFullName, validatePhone, formatAuthError, EMAIL_REGEX } from '../utils/validation';

export default function RegisterHelper() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Field error messages
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Touched states for live feedback after user interacts
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleNameChange = (text: string) => {
    setFullName(text);
    if (nameTouched) {
      const res = validateFullName(text);
      setNameError(res.isValid ? '' : (res.error || ''));
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailTouched) {
      const res = validateEmail(text);
      setEmailError(res.isValid ? '' : (res.error || ''));
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (phoneTouched) {
      const res = validatePhone(text);
      setPhoneError(res.isValid ? '' : (res.error || ''));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordTouched) {
      const res = validatePassword(text);
      setPasswordError(res.isValid ? '' : (res.error || ''));
    }
  };

  const handleRegister = async () => {
    // Mark all as touched
    setNameTouched(true);
    setEmailTouched(true);
    setPhoneTouched(true);
    setPasswordTouched(true);

    const nameRes = validateFullName(fullName);
    setNameError(nameRes.isValid ? '' : (nameRes.error || ''));

    const emailRes = validateEmail(email);
    setEmailError(emailRes.isValid ? '' : (emailRes.error || ''));

    const phoneRes = validatePhone(phone);
    setPhoneError(phoneRes.isValid ? '' : (phoneRes.error || ''));

    const passRes = validatePassword(password);
    setPasswordError(passRes.isValid ? '' : (passRes.error || ''));

    if (!nameRes.isValid || !emailRes.isValid || !phoneRes.isValid || !passRes.isValid) {
      const firstError = nameRes.error || emailRes.error || phoneRes.error || passRes.error;
      Alert.alert('අවධානයට (Invalid Input)', firstError);
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/register`, {
        email: cleanEmail,
        password: password,
        full_name: cleanName,
        phone: cleanPhone || undefined,
        user_type: 'VOLUNTEER'
      });

      const loginResponse = await axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/login`, {
        email: cleanEmail,
        password: password
      });
      const { access_token, refresh_token, tenant_id } = loginResponse.data;

      await saveAuthTokens({
        accessToken: access_token,
        refreshToken: refresh_token,
        userRole: 'VOLUNTEER',
        tenantId: tenant_id,
      });

      router.replace('/volunteer');

    } catch (error: any) {
      console.error(error);
      const isNetworkErr = !error.response || error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network');

      if (isNetworkErr) {
        Alert.alert(
          'සංඥා නොමැත (Network Error)',
          'සර්වර් එක සම්බන්ධ කරගත නොහැක. ඔබගේ අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.'
        );
      } else {
        const errorMsg = formatAuthError(error);
        Alert.alert('දෝෂයකි (Error)', errorMsg);
      }
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
              <FontAwesome5 name="hands-helping" size={40} color="#00897B" />
            </View>
            <Text style={styles.title}>මට උදව් කළ හැක</Text>
            <Text style={styles.subtitle}>ස්වේච්ඡා සේවකයෙකු ලෙස එක්වන්න.</Text>
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={[
              styles.inputContainer,
              nameError ? styles.inputContainerError : (nameTouched && fullName.trim().length >= 2 ? styles.inputContainerSuccess : null)
            ]}>
              <MaterialIcons name="person" size={20} color={nameError ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="සම්පූර්ණ නම (Full Name)"
                value={fullName}
                onChangeText={handleNameChange}
                onBlur={() => {
                  setNameTouched(true);
                  const res = validateFullName(fullName);
                  setNameError(res.isValid ? '' : (res.error || ''));
                }}
                placeholderTextColor="#9CA3AF"
              />
              {nameTouched && fullName.trim().length >= 2 && !nameError && (
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
              )}
            </View>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            {/* Email (Gmail) */}
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
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : (
              email.length > 0 && !isEmailValidFormat ? (
                <Text style={styles.hintText}>උදා: yourname@gmail.com</Text>
              ) : null
            )}

            {/* Phone */}
            <View style={[
              styles.inputContainer,
              phoneError ? styles.inputContainerError : null
            ]}>
              <MaterialIcons name="phone" size={20} color={phoneError ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="දුරකථන අංකය (07XXXXXXXX)"
                value={phone}
                onChangeText={handlePhoneChange}
                onBlur={() => {
                  setPhoneTouched(true);
                  const res = validatePhone(phone);
                  setPhoneError(res.isValid ? '' : (res.error || ''));
                }}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            {/* Password */}
            <View style={[
              styles.inputContainer,
              passwordError ? styles.inputContainerError : (password.length >= 10 ? styles.inputContainerSuccess : null)
            ]}>
              <MaterialIcons name="lock" size={20} color={passwordError ? '#EF4444' : '#6B7280'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="මුරපදය (අවම අක්ෂර 10ක්)"
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={() => {
                  setPasswordTouched(true);
                  const res = validatePassword(password);
                  setPasswordError(res.isValid ? '' : (res.error || ''));
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
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : (
              password.length > 0 ? (
                <Text style={[styles.hintText, password.length >= 10 ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                  {password.length >= 10 ? `✓ මුරපදය ප්‍රමාණවත්ය (${password.length} අක්ෂර)` : `අවම අක්ෂර 10ක් අවශ්‍යයි (${password.length}/10)`}
                </Text>
              ) : null
            )}

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
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, marginBottom: 14, paddingHorizontal: 15 },
  inputContainerError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputContainerSuccess: { borderColor: '#10B981' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1F2937' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -10, marginBottom: 12, marginLeft: 4, fontWeight: '500' },
  hintText: { fontSize: 12, color: '#6B7280', marginTop: -10, marginBottom: 12, marginLeft: 4 },
  button: { backgroundColor: '#00897B', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 25, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' }
});