import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";


const BACKEND_URL = 'http://10.77.157.42:8001/api';  

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
      // මෙතන tenant_slug එක නෑ, මොකද මේවා Global App Logins නිසා
      const res = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: email,
        password: password
      });

      await SecureStore.setItemAsync('access_token', res.data.access_token);
      // Backend එකෙන් ආපු හැංගිලා තියෙන ඩේටා ටික එළියට ගන්නවා
      const decodedToken = jwtDecode(res.data.access_token);
    
      console.log(decodedToken.roles);      // උදා: ['victim']
      console.log(decodedToken.user_type);  // උදා: 'victim'
      console.log(decodedToken.sub);    // User ගේ UUID එක
      console.log(decodedToken.tenant_id);  // Tenant ගේ UUID එක
      
      if (decodedToken.user_type === 'VICTIM') {
        await SecureStore.setItemAsync('user_role', 'VICTIM');
        router.replace('/victim');
      }else if (decodedToken.user_type === 'VOLUNTEER') {
        await SecureStore.setItemAsync('user_role', 'VOLUNTEER'); 
        router.replace('/volunteer'); ///methana yanne volunteer kiyana tabs folder ekata.eke index.tsx file 
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Login Failed', 'Email හෝ Password වැරදියි.');
    } finally {
      setIsLoading(false);
    }
  };

 return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry
      />
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (
        // 🚨 FIX: Default Button එක වෙනුවට TouchableOpacity එකක් දැම්මා
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      )}
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