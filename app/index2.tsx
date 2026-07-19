import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  // අපි කලින් test කරන්න හදපු admin details මෙතන default දාගමු ලේසි වෙන්න
  const [tenantSlug, setTenantSlug] = useState('kolonnawa'); 
  const [email, setEmail] = useState('admin@example.org');
  const [password, setPassword] = useState('change-me-now');

  const handleLogin = async () => {
    try {
      // මෙතන IP එක ඔයාගේ ලැප් එකේ IPv4 එකට මාරු කරන්න!
      const BACKEND_URL = 'http://172.20.10.5:8000/api/auth/login';

      const response = await axios.post(BACKEND_URL, {
        tenant_slug: tenantSlug,
        email: email,
        password: password
      });

      // Backend එකෙන් දෙන Token එක අරගෙන Phone එකේ සේව් කරනවා
      const token = response.data.access_token;
      await SecureStore.setItemAsync('access_token', token);
      
      Alert.alert("නියමයි!", "සාර්ථකව Login වුණා 🎉");
      console.log("Token එක:", token);
      
      // ඊළඟට Home Screen එකට යවන කෝඩ් එක මෙතනට එන්න ඕනේ

    } catch (error) {
      Alert.alert("අවුලක්!", "Login වෙන්න බැරි වුණා. විස්තර හරියට බැලුවද?");
      console.error("Login Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RCP Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Organization (Tenant Slug)"
        value={tenantSlug}
        onChangeText={setTenantSlug}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});