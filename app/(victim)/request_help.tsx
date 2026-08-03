import React, { useState,useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'; //for location 
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


export default function RequestHelpScreen() {
  const [disasterType, setDisasterType] = useState<string | null>(null);
  const [otherDisaster, setOtherDisaster] = useState(''); // 'වෙනත්' ආපදාව ලියන්න
  
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState(''); // 'වෙනත්' අවශ්‍යතාවය ලියන්න
  
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚨 වැඩි කරපු ආපදා වර්ග
  const disasterOptions = [
    { id: 'flood', label: 'ගංවතුර', icon: 'water' },
    { id: 'landslide', label: 'නායයෑම්', icon: 'image-filter-hdr' },
    { id: 'storm', label: 'දැඩි සුළං', icon: 'weather-windy' },
    { id: 'fire', label: 'ගිනිගැනීම්', icon: 'fire' },
    { id: 'animal', label: 'වනඅලි/සතුන්', icon: 'paw' },
    { id: 'other', label: 'වෙනත්', icon: 'dots-horizontal' },
  ];

  // 📦 වැඩි කරපු අවශ්‍යතා වර්ග
  const needsOptions = [
    { id: 'cooked_food', label: 'පිසූ ආහාර', icon: 'hamburger' },
    { id: 'dry_rations', label: 'වියළි ආහාර', icon: 'box' },
    { id: 'water', label: 'පානීය ජලය', icon: 'tint' },
    { id: 'medical', label: 'වෛද්‍ය ආධාර', icon: 'briefcase-medical' },
    { id: 'rescue', label: 'බෝට්ටු/මුදාගැනීම්', icon: 'life-ring' },
    { id: 'shelter', label: 'ආරක්ෂිත නවාතැන්', icon: 'campground' },
    { id: 'clothes', label: 'ඇඳුම් පැළඳුම්', icon: 'tshirt' },
    { id: 'other', label: 'වෙනත්', icon: 'plus-circle' },
  ];


  // --- Offline Sync සඳහා අලුත් States ---
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // --- Location සඳහා අලුත් States ---
  const [locationCoords, setLocationCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState('getting'); // 'getting' | 'done' | 'error'

  // App එක ලෝඩ් වෙද්දිම සිග්නල් තියෙනවද බලනවා
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      
      // සිග්නල් ආපු ගමන්, යවන්න බැරි වුණු ඒව තියෙනවද බලලා යවනවා
      if (state.isConnected) {
        syncOfflineRequests(); //this function send offlinerequest to backend when online
      }
    });
    checkOfflineRequests(); // මුලින්ම පරණ ඒව තියෙනවද බලන්න කෝල් කරනවා

    return () => unsubscribe();
  }, []);

  //new useeEffect for getting location when the component mounts

  useEffect(() => {
    (async () => {
      try {
        // 1. Permission ඉල්ලනවා
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          // Permission දුන්නේ නැත්නම්
          setLocationStatus('error');
          return;
        }

        // 2. Permission දුන්නා නම්, Location එක ගන්නවා (High Accuracy)
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        // 3. ඩේටා ටික State එකට දාගන්නවා
        setLocationCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        setLocationStatus('done');

      } catch (error) {
        console.error("Location Error:", error);
        setLocationStatus('error');
      }
    })();
  }, []);



  const toggleNeed = (id: string) => {
    if (selectedNeeds.includes(id)) {
      setSelectedNeeds(selectedNeeds.filter(item => item !== id));
    } else {
      setSelectedNeeds([...selectedNeeds, id]);
    }
  };



  //new functions added for offline sync
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

  const syncOfflineRequests = async () => {
    try {
      const existingRequests = await AsyncStorage.getItem('offline_requests');
      if (!existingRequests) return;

      const requestsList = JSON.parse(existingRequests);
      if (requestsList.length === 0) return;

      console.log("Syncing offline requests to server...", requestsList);

      // 1. SecureStore එකෙන් Token එක ගන්නවා 
      const token = await SecureStore.getItemAsync('access_token');
      


      // 2. Array එකේ තියෙන හැම Request එකක්ම Backend Schema එකට ගලපලා යවනවා
      const syncPromises = requestsList.map(async (req) => {
        const payload = {
          disaster_type: req.disaster,
          needs: req.needs,
          description: req.description || null,
          latitude: req.latitude || null,
          longitude: req.longitude || null
        };

        return axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/volunteer/requests`, payload, {
          headers: {
            Authorization: `Bearer ${token}` // Token එක යවනවා
          }
        });
      });

      // 3. ඔක්කොම API Calls ටික යනකන් මෙතනින් බලන් ඉන්නවා
      await Promise.all(syncPromises);

      // 4. සාර්ථකව ඔක්කොම යැව්වා නම් විතරක් ෆෝන් එකේ මෙමරියෙන් මකලා දානවා
      await AsyncStorage.removeItem('offline_requests');
      setOfflineCount(0);
      
      Alert.alert("✅ Sync Complete", "ඔබගේ සියලුම හදිසි ඉල්ලීම් සර්වර් එක වෙත සාර්ථකව යොමු කරන ලදී! 🚀");

    } catch (error) {
      console.error("Failed to sync data:", error);
      // මොකක් හරි Error එකක් ආවොත් අපි ඩේටා මකන්නේ නෑ, ඊළඟ පාර සිග්නල් ආවම ආයෙත් ට්‍රයි කරනවා
    }
  };


  

  const handleSubmit = async () => {   //this function called when user click the submit button
    // 1. Validation: ආපදාව තෝරලාද?
    if (!disasterType) {
      Alert.alert('අවධානයයි', 'කරුණාකර සිදුවී ඇති ආපදාවේ ස්වභාවය තෝරන්න.');
      return;
    }
    // 'වෙනත්' තෝරලා නම්, ඒක ලියලා තියෙන්න ඕනේ
    if (disasterType === 'other' && otherDisaster.trim() === '') {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබගේ ආපදාව කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    // 2. Validation: ආධාර තෝරලාද?
    if (selectedNeeds.length === 0) {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබට අවශ්‍ය කුමන ආධාරයක්දැයි තෝරන්න.');
      return;
    }
    // 'වෙනත්' තෝරලා නම්, ඒක ලියලා තියෙන්න ඕනේ
    if (selectedNeeds.includes('other') && otherNeed.trim() === '') {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබට අවශ්‍ය වෙනත් ආධාරය කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    setIsSubmitting(true);
    
    // Backend එකට යවන ඩේටා ටික මෙහෙමයි හැදෙන්නේ (ඉස්සරහට පාවිච්චි කරන්න ලේසියි)
    const finalDisaster = disasterType === 'other' ? otherDisaster : disasterType;
    const finalNeeds = selectedNeeds.map(need => need === 'other' ? `other:${otherNeed}` : need);

    console.log("Submitting:", { finalDisaster, finalNeeds, description });

    
    // මෙන්න මේකයි අපි අලුතින් හදන Object එක
    const newRequest = {
      id: Date.now().toString(),
      disaster: finalDisaster,
      needs: finalNeeds,
      description: description,
      // 👇 මේ පේළි දෙක අලුතින් එකතු කරන්න
      latitude: locationCoords ? locationCoords.latitude : null,
      longitude: locationCoords ? locationCoords.longitude : null,
      status: 'pending_sync',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. කලින් සේව් කරපු ඒව ගන්නවා
      const existingRequests = await AsyncStorage.getItem('offline_requests');
      let requestsList = existingRequests ? JSON.parse(existingRequests) : [];

      // 2. අලුත් එක ඒකට එකතු කරනවා
      requestsList.push(newRequest);
      await AsyncStorage.setItem('offline_requests', JSON.stringify(requestsList));
      setOfflineCount(requestsList.length);

      // 3. සිග්නල් තියෙනවද බලලා වැඩේ කරනවා
      if (isOnline) {
        await syncOfflineRequests(); // සිග්නල් තියෙන නිසා එවෙලෙම යවනවා
      } else {
        Alert.alert(
          "Saved Offline", 
          "දැන් සිග්නල් නොමැත. ඔබගේ තොරතුරු දුරකථනයේ සුරැකිව ඇති අතර, සිග්නල් ලැබුණු සැනින් ස්වයංක්‍රීයව යොමු කෙරේ."
        );
      }
      
      // Form එක Clear කරනවා
      setDisasterType(null);
      setOtherDisaster('');
      setSelectedNeeds([]);
      setOtherNeed('');
      setDescription('');
      
    } catch (error) {
      Alert.alert("Error", "ඩේටා සේව් කිරීමට නොහැකි විය.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
       {/* නෙට්වර්ක් ස්ටේටස් එක */}
      <View style={{ padding: 8, backgroundColor: isOnline ? '#e6f7ed' : '#ffe6e6', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontWeight: 'bold', color: isOnline ? '#2e7d32' : '#c62828' }}>
          {isOnline ? "🟢 Online - Connected" : "🔴 Offline - No Internet"}
        </Text>
      </View>
      {/* Location Status Badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
        {locationStatus === 'getting' && (
          <Text style={{ fontSize: 13, color: '#FF9800', fontWeight: 'bold' }}>
            ⏳ ඔබගේ ස්ථානය හඳුනාගනිමින් පවතී...
          </Text>
        )}
        {locationStatus === 'done' && (
          <Text style={{ fontSize: 13, color: '#55964d', fontWeight: 'bold' }}>
            ✅ ඔබගේ ස්ථානය සාර්ථකව හඳුනාගන්නා ලදී (GPS)
          </Text>
        )}
        {locationStatus === 'error' && (
          <Text style={{ fontSize: 13, color: '#c62828', fontWeight: 'bold' }}>
            ⚠️ ස්ථානය හඳුනාගැනීමට නොහැකි විය. කරුණාකර Location On කරන්න.
          </Text>
        )}
      </View>

      {/* යවන්න බැරි වුණු ඒව තියෙනවා නම් පෙන්වන Badge එක */}
      {offlineCount > 0 && (
        <View style={{ backgroundColor: '#e6f0ff', padding: 10, borderRadius: 8, marginBottom: 15, marginHorizontal: 20 }}>
          <Text style={{ color: '#0052cc', fontWeight: 'bold', textAlign: 'center' }}>
            🔄 Sync වීමට ඇති ඉල්ලීම් ගණන: {offlineCount}
          </Text>
        </View>
      )} 
      <View style={styles.header}>
        <FontAwesome5 name="hands-helping" size={40} color="#E53935" />
        <Text style={styles.title}>හදිසි ආධාර ඉල්ලන්න</Text>
        <Text style={styles.subtitle}>ඔබගේ වත්මන් තත්ත්වය පහතින් දක්වන්න. ඔබගේ ස්ථානය අප ස්වයංක්‍රීයව හඳුනාගනිමු.</Text>
      </View>

      {/* 🌪️ ආපදා වර්ගය තෝරන කොටස */}
      <Text style={styles.sectionTitle}>සිදුවී ඇති ආපදාව කුමක්ද?</Text>
      <View style={styles.optionsContainer}>
        {disasterOptions.map((option) => {
          const isSelected = disasterType === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, isSelected && styles.disasterCardSelected]}
              onPress={() => setDisasterType(option.id)}
            >
              <MaterialCommunityIcons 
                name={option.icon as any} 
                size={28} 
                color={isSelected ? 'white' : '#E53935'} 
                style={{ marginBottom: 8 }} 
              />
              <Text style={[styles.optionText, { color: isSelected ? 'white' : '#E53935' }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 'වෙනත්' ආපදාව තේරුවොත් එන Input එක */}
      {disasterType === 'other' && (
        <TextInput
          style={styles.otherInput}
          placeholder="ආපදාව කුමක්දැයි මෙහි ලියන්න..."
          value={otherDisaster}
          onChangeText={setOtherDisaster}
        />
      )}

      {/* 📦 අවශ්‍ය ආධාර තෝරන කොටස */}
      <Text style={styles.sectionTitle}>ඔබට අවශ්‍ය ආධාර මොනවාද?</Text>
      <View style={styles.optionsContainer}>
        {needsOptions.map((option) => {
          const isSelected = selectedNeeds.includes(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, isSelected && styles.needsCardSelected]}
              onPress={() => toggleNeed(option.id)}
            >
              <FontAwesome5 
                name={option.icon} 
                size={24} 
                // කහ පාට බැක්ග්‍රවුන්ඩ් එකට කළු පාට අයිකන් එකක් ලස්සනයි
                color={isSelected ? '#333' : '#FF9800'} 
                style={{ marginBottom: 8 }} 
              />
              <Text style={[styles.optionText, isSelected ? styles.needsTextSelected : { color: '#FF9800' }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 'වෙනත්' ආධාරය තේරුවොත් එන Input එක */}
      {selectedNeeds.includes('other') && (
        <TextInput
          style={styles.otherInput}
          placeholder="අවශ්‍ය වෙනත් දේ මෙහි ලියන්න..."
          value={otherNeed}
          onChangeText={setOtherNeed}
        />
      )}

      {/* අමතර විස්තර */}
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>අමතර විස්තර (විකල්ප):</Text>
        <TextInput
          style={styles.input}
          placeholder="උදා: පවුලේ 4ක් ඉන්නවා, වතුර ගේ ඇතුළට ඇවිත්..."
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitBtnText}>
          {isSubmitting ? 'යැවෙමින් පවතී...' : '🚨 දැන්ම උදව් ඉල්ලන්න'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 5, paddingHorizontal: 10 },
  
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 5 },
  
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 5 },
  optionCard: {
    width: '31%', // පේළියට 3ක් එන්න හැදුවා Buttons වැඩි නිසා (48% වෙනුවට 31%)
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  
  // ආපදා Button එක Select කළාම (තැඹිලි)
  disasterCardSelected: { backgroundColor: '#E53935', borderColor: '#E53935' },
  
  // ආධාර Button එක Select කළාම (කහ පාට)
  needsCardSelected: { backgroundColor: '#FFC107', borderColor: '#FFB300' },
  needsTextSelected: { color: '#333' }, // කහ පසුබිමට තද කළු/අළු අකුරු
  
  optionText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },

  otherInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },

  inputContainer: { marginBottom: 20, marginTop: 10 },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 15,
    textAlignVertical: 'top',
  },

  submitBtn: {
    backgroundColor: '#E53935',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    marginBottom: 40,
    marginTop: 10
  },
  submitBtnDisabled: { backgroundColor: '#ef9a9a' },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});