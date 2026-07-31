import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const BACKEND_URL = 'http://10.77.157.42:8001/api';   

export default function RegisterHelper() {
  const router = useRouter();

  // Input fields වල දත්ත තියාගන්න states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // ෆෝම් එක හිස්ද කියලා බලනවා
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'කරුණාකර සියලුම තොරතුරු ඇතුලත් කරන්න.');
      return;
    }

    setIsLoading(true);
    console.log("යන URL එක: ", `${BACKEND_URL}/auth/register`);

    try {
      // 1. Backend එකේ Register කරනවා (role එක 'volunteer' විදිහට)
      await axios.post(`${BACKEND_URL}/auth/register`, {
        email: email,
        password: password,
        full_name: fullName,
        phone: phone,
        user_type: 'VOLUNTEER'
      });

      // 2. Register වුණ ගමන්ම Login වෙලා Token එක ගන්නවා
      const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: email,
        password: password
      });

      const accessToken = loginResponse.data.access_token;

      // 3. Token එකයි Role එකයි ෆෝන් එකේ සේව් කරනවා
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('user_role', 'volunteer');

      // 4. සේරම හරි නම් Volunteer Dashboard එකට යවනවා
      router.replace('/volunteer');

    } catch (error: any) {
      console.error(error);
      console.log("Validation Error ඩීටේල්ස්: ", JSON.stringify(error.response?.data, null, 2));
      // Backend එකෙන් එන Error එක පෙන්වන්න
      const errorMsg = error.response?.data?.detail || 'Registration failed. කරුණාකර නැවත උත්සහ කරන්න.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offer Help (Volunteer Registration)</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="සම්පූර්ණ නම (Full Name)" 
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput 
        style={styles.input} 
        placeholder="ඊමේල් (Email)" 
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput 
        style={styles.input} 
        placeholder="දුරකථන අංකය (Phone Number)" 
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput 
        style={styles.input} 
        placeholder="මුරපදය (Password)" 
        value={password}
        onChangeText={setPassword}
        secureTextEntry 
      />
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#00C851" />
      ) : (
        <Button title="Register" onPress={handleRegister} color="#00C851" />
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