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
  const [otherDisaster, setOtherDisaster] = useState(''); // for input other disaster type if user selects 'වෙනත්' (other)
  
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState(''); // for input other need if user selects 'වෙනත්' (other)
  
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const disasterOptions = [
    { id: 'flood', label: 'ගංවතුර', icon: 'water' },
    { id: 'landslide', label: 'නායයෑම්', icon: 'image-filter-hdr' },
    { id: 'storm', label: 'දැඩි සුළං', icon: 'weather-windy' },
    { id: 'fire', label: 'ගිනිගැනීම්', icon: 'fire' },
    { id: 'animal', label: 'වනඅලි/සතුන්', icon: 'paw' },
    { id: 'other', label: 'වෙනත්', icon: 'dots-horizontal' },
  ];


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


  // new states for offline sync
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  //new states for location langitude latitude
  const [locationCoords, setLocationCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState('getting'); // 'getting' | 'done' | 'error'

  // check if have signal when loading the app
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      
      if (state.isConnected) {
        syncOfflineRequests(); //this function send offlinerequest to backend when online
      }
    });
    checkOfflineRequests(); //first call to check number of offline requests when app loads

    return () => unsubscribe();
  }, []);

  //new useeEffect for getting location when the component mounts

  useEffect(() => {
    (async () => {
      try {
        // 1.request permission for location
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          // if dont give permission then show alert and set location status to error
          setLocationStatus('error');
          return;
        }

        // 2. if given permission then get location
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        // 3. put data into states
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

      // 1. get token first before call backend from secure store
      const token = await SecureStore.getItemAsync('access_token');
      


      // 2. Send all requests to backend using Promise.all for parallel execution
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
            Authorization: `Bearer ${token}` //send the token in the header for authentication
          }
        });
      });

      // 3. await for all promises to complete, if any fails it will go to catch block
      await Promise.all(syncPromises);

      // 4. if sent successfully then clear the offline requests from AsyncStorage and reset the count
      await AsyncStorage.removeItem('offline_requests');
      setOfflineCount(0);// again set state to zero
      
      Alert.alert("✅ Sync Complete", "ඔබගේ සියලුම හදිසි ඉල්ලීම් සර්වර් එක වෙත සාර්ථකව යොමු කරන ලදී! 🚀");

    } catch (error) {
      console.error("Failed to sync data:", error);
      //if any error occurs during sync, we keep the offline requests in AsyncStorage for next time
    }
  };


  

  const handleSubmit = async () => {   //this function called when user click the submit button
    // 1.if disaster type selected or not
    if (!disasterType) {
      Alert.alert('අවධානයයි', 'කරුණාකර සිදුවී ඇති ආපදාවේ ස්වභාවය තෝරන්න.');
      return;
    }
    // if user select  (other) then check if they write something in the input field :)
    if (disasterType === 'other' && otherDisaster.trim() === '') {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබගේ ආපදාව කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    // 2. Validation: if select needs or not
    if (selectedNeeds.length === 0) {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබට අවශ්‍ය කුමන ආධාරයක්දැයි තෝරන්න.');
      return;
    }
    // it should be written if selected (other) in needs then check if they write something in the input field
    if (selectedNeeds.includes('other') && otherNeed.trim() === '') {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබට අවශ්‍ය වෙනත් ආධාරය කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    setIsSubmitting(true);
    
    // 3. Prepare the data to be sent to backend or saved offline
    const finalDisaster = disasterType === 'other' ? otherDisaster : disasterType;
    const finalNeeds = selectedNeeds.map(need => need === 'other' ? `other:${otherNeed}` : need);

    console.log("Submitting:", { finalDisaster, finalNeeds, description });

    
    // new request object to save in AsyncStorage
    const newRequest = {
      id: Date.now().toString(),
      disaster: finalDisaster,
      needs: finalNeeds,
      description: description,
      latitude: locationCoords ? locationCoords.latitude : null,
      longitude: locationCoords ? locationCoords.longitude : null,
      status: 'pending_sync',
      createdAt: new Date().toISOString()
    };

    try {
      //get existing offline requests from AsyncStorage and add the new one to it
      const existingRequests = await AsyncStorage.getItem('offline_requests');
      let requestsList = existingRequests ? JSON.parse(existingRequests) : [];

      // push the new request to the list and save it back to AsyncStorage
      requestsList.push(newRequest);
      await AsyncStorage.setItem('offline_requests', JSON.stringify(requestsList));
      setOfflineCount(requestsList.length);

      //check if online then send the request to backend immediately, else keep it in AsyncStorage for later sync
      if (isOnline) {
        await syncOfflineRequests(); //signal is there so send the request to backend
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
       {/* network status badge */}
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

      {/* Offline Requests Badge */}
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

      {/* 🌪️ disaster type selecting part */}
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

      {/* Other Disaster Input */}
      {disasterType === 'other' && (
        <TextInput
          style={styles.otherInput}
          placeholder="ආපදාව කුමක්දැයි මෙහි ලියන්න..."
          value={otherDisaster}
          onChangeText={setOtherDisaster}
        />
      )}

      {/* Needs Selection */}
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

      {/* Other Needs Input */}
      {selectedNeeds.includes('other') && (
        <TextInput
          style={styles.otherInput}
          placeholder="අවශ්‍ය වෙනත් දේ මෙහි ලියන්න..."
          value={otherNeed}
          onChangeText={setOtherNeed}
        />
      )}

      {/* Additional Details */}
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
    width: '31%', 
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  
  // Disaster Card selected color set to red
  disasterCardSelected: { backgroundColor: '#E53935', borderColor: '#E53935' },
  
  // Needs Card selected color set to yellow
  needsCardSelected: { backgroundColor: '#FFC107', borderColor: '#FFB300' },
  needsTextSelected: { color: '#333' }, 
  
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