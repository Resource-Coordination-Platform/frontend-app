import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sahasra App</Text>
      <Text style={styles.subtitle}>ඔබට අවශ්‍ය කුමක්ද?</Text>

      <TouchableOpacity 
        style={[styles.button, styles.victimBtn]} 
        onPress={() => router.push('/register-victim')}
      >
        <Text style={styles.btnText}>I Need Help (මට උදව් අවශ්‍යයි)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.helperBtn]} 
        onPress={() => router.push('/register-helper')}
      >
        <Text style={styles.btnText}>Offer Help (මට උදව් කළ හැක)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, marginBottom: 40 },
  button: { width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  victimBtn: { backgroundColor: '#ff4444' },
  helperBtn: { backgroundColor: '#00C851' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});