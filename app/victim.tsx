// app/victim.tsx
import { View, Text, Button } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function VictimDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('user_role');
    router.replace('/welcome');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Victim Dashboard</Text>
      <Button title="Logout" onPress={handleLogout} color="red" />
    </View>
  );
}