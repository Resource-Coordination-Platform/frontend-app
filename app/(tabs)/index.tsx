import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export default function HelpRequestScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // 1. නෙට්වර්ක් එක වෙනස් වෙන එක ලයිව් චෙක් කිරීම
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // state.isConnected කියන්නේ ඔන්ලයින්ද නැද්ද කියන එක (true/false)
      setIsOnline(!!state.isConnected);
      
      if (state.isConnected) {
        // ඔන්ලයින් ආපු ගමන් සේව් වෙලා තියෙන ඩේටා සින්ක් කරන්න ට්‍රයි කරනවා
        syncOfflineRequests();
      }
    });

    checkOfflineRequests();

    return () => unsubscribe();
  }, []);

  const checkOfflineRequests = async () => {
    try {
      const existingRequests = await AsyncStorage.getItem('offline_requests');
      if (existingRequests !== null) {
        const parsed = JSON.parse(existingRequests);
        setOfflineCount(parsed.length);
      }
    } catch (e) {
      console.log("Error reading offline data", e);
    }
  };

  // 2. ඩේටා බැක්එන්ඩ් එකට යවන ෆන්ක්ෂන් එක
  const syncOfflineRequests = async () => {
    try {
      const existingRequests = await AsyncStorage.getItem('offline_requests');
      if (!existingRequests) return;

      const requestsList = JSON.parse(existingRequests);
      if (requestsList.length === 0) return;

      console.log("Syncing offline requests to server...", requestsList);

      /* 
        [FUTURE BACKEND INTEGRATION]
        මචන්, Chandupa හෝ Tharindu බැක්එන්ඩ් API එක හැදුවට පස්සේ අපි මෙන්න මේ වගේ Axios හෝ Fetch එකක් ලියනවා:
        
        await fetch('https://your-api.com/v1/help-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestsList)
        });
      */

      // දැනට සර්වර් එකට ගියා කියලා හිතලා තත්පර 2ක ඩිලේ එකකින් ලෝකල් ඩේටා ටික ක්ලියර් කරමු
      setTimeout(async () => {
        await AsyncStorage.removeItem('offline_requests');
        setOfflineCount(0);
        Alert.alert("Sync Complete", "ෆෝන් එකෙහි තිබූ සියලුම හදිසි ඉල්ලීම් සාර්ථකව සර්වර් එක වෙත යොමු කරන ලදී! 🚀");
      }, 2000);

    } catch (error) {
      console.log("Failed to sync data", error);
    }
  };

  const handleSubmit = async () => {
    if (!phone || !description) {
      Alert.alert("Error", "කරුණාකර දුරකථන අංකය සහ අවශ්‍ය උදව්ව ඇතුළත් කරන්න.");
      return;
    }

    const newRequest = {
      id: Date.now().toString(),
      name,
      phone,
      location,
      description,
      status: 'pending_sync',
      createdAt: new Date().toISOString()
    };

    try {
      const existingRequests = await AsyncStorage.getItem('offline_requests');
      let requestsList = [];
      
      if (existingRequests !== null) {
        requestsList = JSON.parse(existingRequests);
      }

      requestsList.push(newRequest);
      await AsyncStorage.setItem('offline_requests', JSON.stringify(requestsList));
      setOfflineCount(requestsList.length);

      // ඔන්ලයින් නම් එවෙලෙම සින්ක් කරන්න උත්සාහ කරනවා, නැත්නම් ඕෆ්ලයින් සේව් වෙනවා
      if (isOnline) {
        await syncOfflineRequests();
      } else {
        Alert.alert(
          "Saved Offline", 
          "දැන් සිග්නල් නැත. ඔබේ තොරතුරු ෆෝන් එකෙහි සුරැකිව ඇති අතර සිග්නල් ආපු සැනින් ස්වේච්ඡා සේවකයන් වෙත යොමු කෙරේ."
        );
      }
      
      setName('');
      setPhone('');
      setDescription('');
      setLocation('');

    } catch (error) {
      Alert.alert("Error", "ඩේටා සේව් කිරීමට නොහැකි විය.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* නෙට්වර්ක් ස්ටේටස් එක බලාගන්න පොඩි ඉන්ඩිකේටර් එකක් */}
      <View style={[styles.statusBanner, isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusText}>
          {isOnline ? "🟢 Online - Connected" : "🔴 Offline - No Internet"}
        </Text>
      </View>

      <Text style={styles.header}>SOS - උදව් අවශ්‍යයි</Text>
      <Text style={styles.subHeader}>හදිසි අවස්ථාවකදී ඔබේ විස්තර ඇතුළත් කරන්න</Text>

      {offlineCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔄 Sync වීමට ඇති ඉල්ලීම් ගණන: {offlineCount}</Text>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>ඔබේ නම (Name):</Text>
        <TextInput style={styles.input} placeholder="Keshana" value={name} onChangeText={setName} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>දුරකථන අංකය (Phone)*:</Text>
        <TextInput style={styles.input} placeholder="07xxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>පවතින ස්ථානය / ලිපිනය (Location):</Text>
        <TextInput style={styles.input} placeholder="අම්බලන්ගොඩ, ගාල්ල..." value={location} onChangeText={setLocation} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>අවශ්‍ය උදව්ව (What do you need?)*:</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="කෑම සහ ජලය අවශ්‍යයි / වෛද්‍ය ආධාර..." multiline={true} numberOfLines={4} value={description} onChangeText={setDescription} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>උදව් ඉල්ලන්න (Request Help)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
    justifyContent: 'center',
  },
  statusBanner: {
    padding: 6,
    borderRadius: 20,
    marginBottom: 15,
    alignSelf: 'center',
  },
  online: { backgroundColor: '#e6f7ed' },
  offline: { backgroundColor: '#ffe6e6' },
  statusText: { fontSize: 12, fontWeight: '600' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#ff4d4d', textAlign: 'center', marginBottom: 5 },
  subHeader: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  badge: { backgroundColor: '#e6f0ff', padding: 10, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#b3d1ff' },
  badgeText: { color: '#0052cc', fontWeight: 'bold', textAlign: 'center' },
  formGroup: { marginBottom: 15 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 5, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#ff4d4d', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});