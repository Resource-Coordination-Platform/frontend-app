import React, { useState,useEffect,useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { NEED_UNITS, newHelpRequestId, enqueueHelpRequest, readOfflineHelpRequests, syncHelpRequests, OfflineHelpRequest, fetchCategories, ResourceCategory, buildUnitsMap } from '../../services/help-requests';
import * as Location from 'expo-location'; //for location 
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch'; //these 2 for background sent requests




const BACKGROUND_SYNC_TASK = 'background-sync-task';


TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return BackgroundFetch.BackgroundFetchResult.NoData;
    const sent = await syncHelpRequests();
    if (!sent) return BackgroundFetch.BackgroundFetchResult.NoData;
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background sync failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});



export default function RequestHelpScreen() {
  const [disasterType, setDisasterType] = useState<string | null>(null);
  const [otherDisaster, setOtherDisaster] = useState(''); // for input other disaster type if user selects 'වෙනත්' (other)
  
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [otherUnit, setOtherUnit] = useState('items');
  const [otherNeed, setOtherNeed] = useState(''); // for input other need if user selects 'වෙනත්' (other)
  
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic categories from resource_categories table
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryUnitsMap, setCategoryUnitsMap] = useState<Record<string, string>>(NEED_UNITS);


  const disasterOptions = [
    { id: 'flood', label: 'ගංවතුර', icon: 'water' },
    { id: 'landslide', label: 'නායයෑම්', icon: 'image-filter-hdr' },
    { id: 'storm', label: 'දැඩි සුළං', icon: 'weather-windy' },
    { id: 'fire', label: 'ගිනිගැනීම්', icon: 'fire' },
    { id: 'animal', label: 'වනඅලි/සතුන්', icon: 'paw' },
    { id: 'other', label: 'වෙනත්', icon: 'dots-horizontal' },
  ];

  // Default icon mapping for common category names (case-insensitive match)
  const CATEGORY_ICON_MAP: Record<string, string> = {
    'food': 'hamburger', 'cooked food': 'hamburger', 'ආහාර': 'hamburger',
    'dry rations': 'box', 'dry food': 'box', 'වියළි ආහාර': 'box',
    'water': 'tint', 'drinking water': 'tint', 'ජලය': 'tint', 'පානීය ජලය': 'tint',
    'medical': 'briefcase-medical', 'medicine': 'briefcase-medical', 'වෛද්‍ය': 'briefcase-medical',
    'rescue': 'life-ring', 'boats': 'life-ring', 'බෝට්ටු': 'life-ring',
    'shelter': 'campground', 'නවාතැන්': 'campground',
    'clothes': 'tshirt', 'clothing': 'tshirt', 'ඇඳුම්': 'tshirt',
    'blankets': 'bed', 'bedding': 'bed',
    'baby': 'baby', 'baby items': 'baby',
    'hygiene': 'pump-soap', 'sanitary': 'pump-soap',
    'tools': 'tools', 'equipment': 'tools',
  };

  function getCategoryIcon(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
      if (lower.includes(key)) return icon;
    }
    return 'box-open'; // default icon
  }

  // Hardcoded fallback when categories can't be loaded from API
  const fallbackNeedsOptions = [
    { id: 'cooked_food', label: 'පිසූ ආහාර', icon: 'hamburger', unit: 'meal packs' },
    { id: 'dry_rations', label: 'වියළි ආහාර', icon: 'box', unit: 'packs' },
    { id: 'water', label: 'පානීය ජලය', icon: 'tint', unit: 'litres' },
    { id: 'medical', label: 'වෛද්‍ය ආධාර', icon: 'briefcase-medical', unit: 'people' },
    { id: 'rescue', label: 'බෝට්ටු/මුදාගැනීම්', icon: 'life-ring', unit: 'people' },
    { id: 'shelter', label: 'ආරක්ෂිත නවාතැන්', icon: 'campground', unit: 'people' },
    { id: 'clothes', label: 'ඇඳුම් පැළඳුම්', icon: 'tshirt', unit: 'sets' },
  ];

  // Build dynamic needsOptions from fetched categories + always include 'other'
  // Falls back to hardcoded options if no categories were loaded from the API
  const needsOptions = [
    ...(categories.length > 0
      ? categories.map(cat => ({
          id: cat.id,
          label: cat.name,
          icon: getCategoryIcon(cat.name),
          unit: cat.unit,
        }))
      : fallbackNeedsOptions),
    { id: 'other', label: 'වෙනත්', icon: 'plus-circle', unit: 'items' },
  ];


  // new states for offline sync
  const [offlineCount, setOfflineCount] = useState(0);
  const [legacyRequests, setLegacyRequests] = useState<OfflineHelpRequest[]>([]);
  const [editingOfflineId, setEditingOfflineId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  //new states for location langitude latitude
  const [locationCoords, setLocationCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState('getting'); // 'getting' | 'done' | 'error'

  const checkOfflineRequests = useCallback(async () => {
    const rows = await readOfflineHelpRequests();
    setOfflineCount(rows.length);
    setLegacyRequests(rows.filter(row => !row.requested_items?.length));
  }, []);

  const syncOfflineRequests = useCallback(async () => {
    try {
      const sent = await syncHelpRequests();
      if (sent) Alert.alert('Request sent', 'Your help request and quantities were sent successfully.');
    } catch (error) {
      Alert.alert('Saved on your phone', error instanceof Error ? error.message : 'Could not send yet. Retry when connected.');
    } finally {
      await checkOfflineRequests();
    }
  }, [checkOfflineRequests]);

  // check if have signal when loading the app
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      
      if (state.isConnected) {
        void syncOfflineRequests();
      } else {
        void checkOfflineRequests();
      }
    });

    return () => unsubscribe();
  }, [checkOfflineRequests, syncOfflineRequests]);

  // Fetch categories from resource_categories table on mount
  useEffect(() => {
    (async () => {
      try {
        setCategoriesLoading(true);
        const cats = await fetchCategories();
        if (cats.length > 0) {
          setCategories(cats);
          setCategoryUnitsMap({ ...NEED_UNITS, ...buildUnitsMap(cats) });
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    })();
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


  ///////////////////////////////////////////////////////////////

  useEffect(() => {
    // Register the background task
    async function registerBackgroundFetchAsync() {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 60 * 15, // 15 min each sending
          stopOnTerminate: false,   // (Android only)
          startOnBoot: true,        // even phone restart also run this
        });
        console.log("Background fetch registered!");
      } catch (err) {
        console.log("Background fetch failed to register:", err);
      }
    }

    registerBackgroundFetchAsync();
  }, []);




  const toggleNeed = (id: string) => {
    if (selectedNeeds.includes(id)) {
      setSelectedNeeds(selectedNeeds.filter(item => item !== id));
    } else {
      setSelectedNeeds([...selectedNeeds, id]);
      setQuantities(current => ({ ...current, [id]: current[id] || '1' }));
    }
  };



  //new functions added for offline sync in foreground app
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

    if (!locationCoords) {
      Alert.alert('Location required', 'ආධාර ගෙන එන්න ඔබගේ ස්ථානය අවශ්‍යයි. Location permission ලබාදී නැවත උත්සාහ කරන්න.');
      return;
    }
    if (selectedNeeds.some(id => !/^[0-9]+$/.test(quantities[id] || '') || Number(quantities[id]) < 1 || Number(quantities[id]) > 100000)) {
      Alert.alert('Quantity required', 'තෝරාගත් සෑම ආධාරයකටම 1 සිට 100000 දක්වා සම්පූර්ණ ප්‍රමාණයක් ඇතුළත් කරන්න.');
      return;
    }
    if (selectedNeeds.includes('other') && !otherUnit.trim()) {
      Alert.alert('Unit required', 'වෙනත් ආධාර සඳහා ඒකකය සඳහන් කරන්න.');
      return;
    }
    setIsSubmitting(true);
    
    // 3. Prepare the data to be sent to backend or saved offline
    const finalDisaster = disasterType === 'other' ? otherDisaster : disasterType;
    const finalNeeds = selectedNeeds.map(need => need === 'other' ? `other:${otherNeed}` : need);



    
    // new request object to save in AsyncStorage
    // For category-based needs: code = category name (for backend matching), label = category name, unit = category unit from DB
    // For 'other': code = 'other:userInput', label = userInput, unit = user-specified unit
    const newRequest = {
      id: editingOfflineId || newHelpRequestId(),
      disaster: finalDisaster,
      needs: finalNeeds,
      requested_items: selectedNeeds.map(id => {
        if (id === 'other') {
          return {
            code: `other:${otherNeed.trim()}`,
            label: otherNeed.trim(),
            quantity: Number(quantities[id]),
            unit: otherUnit.trim(),
            category_id: null,
          };
        }
        // Find the category from the fetched categories
        const category = categories.find(cat => cat.id === id);
        return {
          code: category ? category.name : id,
          label: category ? category.name : (needsOptions.find(option => option.id === id)?.label || id),
          quantity: Number(quantities[id]),
          unit: category ? category.unit : (categoryUnitsMap[id] || 'unit'),
          category_id: category ? category.id : null,
        };
      }),
      description: description,
      latitude: locationCoords ? locationCoords.latitude : null,
      longitude: locationCoords ? locationCoords.longitude : null,
      status: 'pending_sync',
      createdAt: new Date().toISOString()
    };

    try {
      setOfflineCount(await enqueueHelpRequest(newRequest));

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
      setQuantities({});
      setEditingOfflineId(null);
      setOtherNeed('');
      setDescription('');
      
    } catch {
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
          value={otherDisaster} maxLength={100}
          onChangeText={setOtherDisaster}
        />
      )}

      {legacyRequests.map(saved => <TouchableOpacity key={saved.id} style={styles.quantityPanel} onPress={() => {
        setEditingOfflineId(saved.id);
        const known = disasterOptions.some(option => option.id === saved.disaster);
        setDisasterType(known ? saved.disaster : 'other');
        setOtherDisaster(known ? '' : saved.disaster);
        setSelectedNeeds(saved.needs.map(need => need.startsWith('other:') ? 'other' : need));
        setOtherNeed(saved.needs.find(need => need.startsWith('other:'))?.slice(6) || '');
        setDescription(saved.description || '');
        setQuantities({});
        if (saved.latitude != null && saved.longitude != null) setLocationCoords({ latitude: saved.latitude, longitude: saved.longitude });
      }}>
        <Text style={{ fontWeight: '600' }}>පැරණි offline ඉල්ලීම: {saved.needs.join(', ')}</Text>
        <Text>Quantity එකතු කිරීමට මෙතැන ඔබන්න. ඉන්පසු form එක යවන්න.</Text>
      </TouchableOpacity>)}

      {/* Needs Selection - Dynamic categories from resource_categories table */}
      <Text style={styles.sectionTitle}>ඔබට අවශ්‍ය ආධාර මොනවාද?</Text>
      {categoriesLoading ? (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={{ color: '#666', marginTop: 8 }}>ආධාර වර්ග පූරණය වෙමින්...</Text>
        </View>
      ) : (
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
                {'unit' in option && option.id !== 'other' && (
                  <Text style={{ fontSize: 10, color: isSelected ? '#555' : '#999', marginTop: 2 }}>
                    ({option.unit})
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedNeeds.length > 0 && <View style={styles.quantityPanel}>
        <Text style={styles.sectionTitle}>අවශ්‍ය ප්‍රමාණයන් / Quantities</Text>
        {selectedNeeds.map(id => {
          const category = categories.find(cat => cat.id === id);
          const needOption = needsOptions.find(option => option.id === id);
          const displayLabel = id === 'other' 
            ? (otherNeed || 'වෙනත් ආධාර') 
            : (category?.name || needOption?.label || id);
          const displayUnit = id === 'other' 
            ? otherUnit 
            : (category?.unit || categoryUnitsMap[id] || 'unit');
          return (
            <View key={id} style={styles.quantityRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{displayLabel}</Text>
                <Text style={{ color: '#64748b', marginTop: 4 }}>{displayUnit}</Text>
              </View>
              <TextInput
                accessibilityLabel={`Quantity for ${id}`} keyboardType="number-pad" maxLength={6}
                style={styles.quantityInput} value={quantities[id] || ''} placeholder="1"
                onChangeText={value => setQuantities(current => ({ ...current, [id]: value }))}
              />
            </View>
          );
        })}
        {selectedNeeds.includes('other') && <TextInput style={styles.otherInput} value={otherUnit} onChangeText={setOtherUnit} maxLength={40} placeholder="Unit: packs, kg, people…" accessibilityLabel="Unit for other aid" />}
      </View>}

      {/* Other Needs Input */}
      {selectedNeeds.includes('other') && (
        <TextInput
          style={styles.otherInput}
          placeholder="අවශ්‍ය වෙනත් දේ මෙහි ලියන්න..."
          value={otherNeed} maxLength={60}
          onChangeText={setOtherNeed}
        />
      )}

      {/* Additional Details */}
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>අමතර විස්තර (විකල්ප):</Text>
        <TextInput
          style={styles.input}
          placeholder="උදා: පවුලේ 4ක් ඉන්නවා, වතුර ගේ ඇතුළට ඇවිත්..."
          // multiline
          // numberOfLines={3}
          value={description} maxLength={5000}
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
  quantityPanel: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: '#dbe4ed' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  quantityInput: { width: 90, textAlign: 'center', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, padding: 12, fontSize: 18 },
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
