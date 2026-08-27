import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function OfflineSosScreen() {
  const router = useRouter();

  // Form states
  const [disasterType, setDisasterType] = useState<string | null>(null);
  const [otherDisaster, setOtherDisaster] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Network & Offline Queue states
  const [isOnline, setIsOnline] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  // Location states
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'getting' | 'done' | 'error'>('getting');

  const disasterOptions = [
    { id: 'flood', label: 'ගංවතුර', sub: 'Flood', icon: 'water' },
    { id: 'landslide', label: 'නායයෑම්', sub: 'Landslide', icon: 'image-filter-hdr' },
    { id: 'storm', label: 'දැඩි සුළං', sub: 'Storm', icon: 'weather-windy' },
    { id: 'fire', label: 'ගිනිගැනීම්', sub: 'Fire', icon: 'fire' },
    { id: 'animal', label: 'වනඅලි/සතුන්', sub: 'Animals', icon: 'paw' },
    { id: 'other', label: 'වෙනත්', sub: 'Other', icon: 'dots-horizontal' },
  ];

  const needsOptions = [
    { id: 'cooked_food', label: 'පිසූ ආහාර', icon: 'hamburger' },
    { id: 'dry_rations', label: 'වියළි ආහාර', icon: 'box' },
    { id: 'water', label: 'පානීය ජලය', icon: 'tint' },
    { id: 'medical', label: 'වෛද්‍ය ආධාර', icon: 'briefcase-medical' },
    { id: 'rescue', label: 'බෝට්ටු/මුදාගැනීම්', icon: 'life-ring' },
    { id: 'shelter', label: 'ආරක්ෂිත නවාතැන්', icon: 'campground' },
    { id: 'clothes', label: 'ඇඳුම් පැළඳුම්', icon: 'tshirt' },
    { id: 'other', label: 'වෙනත් ආධාර', icon: 'plus-circle' },
  ];

  // Request & capture GPS location
  const fetchLocation = async () => {
    try {
      setLocationStatus('getting');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationStatus('error');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocationCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationStatus('done');
    } catch (error) {
      console.error('Location Error in Offline SOS:', error);
      setLocationStatus('error');
    }
  };

  // Monitor network and load stored offline requests
  useEffect(() => {
    fetchLocation();

    // Check network initially & subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);

      if (online) {
        syncOfflineRequests();
      }
    });

    checkOfflineRequests();

    return () => unsubscribe();
  }, []);

  const checkOfflineRequests = async () => {
    try {
      const existing = await AsyncStorage.getItem('offline_requests');
      if (existing) {
        const parsed = JSON.parse(existing);
        setOfflineCount(parsed.length);
      } else {
        setOfflineCount(0);
      }
    } catch (e) {
      console.log('Error reading offline data', e);
    }
  };

  // Sync offline requests to backend without bearer token when user is unauthenticated
  const syncOfflineRequests = async () => {
    try {
      const existing = await AsyncStorage.getItem('offline_requests');
      if (!existing) return;

      const requestsList = JSON.parse(existing);
      if (requestsList.length === 0) return;

      setIsSyncing(true);
      console.log('Syncing offline SOS requests (Guest/Unauthenticated)...', requestsList);

      // Check if any token exists (may be null if unauthenticated)
      const token = await SecureStore.getItemAsync('access_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const syncPromises = requestsList.map(async (req: any) => {
        const payload = {
          disaster_type: req.disaster,
          needs: req.needs,
          description: req.description || null,
          latitude: req.latitude || null,
          longitude: req.longitude || null,
        };

        return axios.post(`${process.env.EXPO_PUBLIC_BACKEND_URL}/volunteer/requests`, payload, {
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        });
      });

      await Promise.all(syncPromises);
      await AsyncStorage.removeItem('offline_requests');
      setOfflineCount(0);

      Alert.alert(
        '✅ Sync සාර්ථකයි',
        'ඔබගේ නොබැඳි හදිසි ආධාර ඉල්ලීම් සියල්ල සර්වර් එක වෙත සාර්ථකව යොමු කරන ලදී!'
      );
    } catch (error) {
      console.error('Failed to sync offline requests:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleNeed = (id: string) => {
    if (selectedNeeds.includes(id)) {
      setSelectedNeeds(selectedNeeds.filter((item) => item !== id));
    } else {
      setSelectedNeeds([...selectedNeeds, id]);
    }
  };

  const handleSubmitSos = async () => {
    if (!disasterType) {
      Alert.alert('අවධානයයි', 'කරුණාකර සිදුවී ඇති ආපදාවේ ස්වභාවය තෝරන්න.');
      return;
    }

    if (disasterType === 'other' && otherDisaster.trim() === '') {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබගේ ආපදාව කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    if (selectedNeeds.length === 0) {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබට අවශ්‍ය ආධාර වර්ගය තෝරන්න.');
      return;
    }

    if (selectedNeeds.includes('other') && otherNeed.trim() === '') {
      Alert.alert('අවධානයයි', 'කරුණාකර ඔබට අවශ්‍ය වෙනත් ආධාරය කුමක්දැයි සඳහන් කරන්න.');
      return;
    }

    setIsSubmitting(true);

    const finalDisaster = disasterType === 'other' ? otherDisaster : disasterType;
    const finalNeeds = selectedNeeds.map((need) =>
      need === 'other' ? `other:${otherNeed}` : need
    );

    let combinedDescription = description.trim();
    if (contactInfo.trim()) {
      combinedDescription = `[සම්බන්ධ කර ගැනීමට: ${contactInfo.trim()}] ${combinedDescription}`;
    }

    const newRequest = {
      id: Date.now().toString(),
      disaster: finalDisaster,
      needs: finalNeeds,
      description: combinedDescription || null,
      latitude: locationCoords ? locationCoords.latitude : null,
      longitude: locationCoords ? locationCoords.longitude : null,
      status: 'pending_sync',
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = await AsyncStorage.getItem('offline_requests');
      const requestsList = existing ? JSON.parse(existing) : [];
      requestsList.push(newRequest);
      await AsyncStorage.setItem('offline_requests', JSON.stringify(requestsList));
      setOfflineCount(requestsList.length);

      // If connected to network, sync immediately; otherwise show offline confirmation
      if (isOnline) {
        await syncOfflineRequests();
      } else {
        Alert.alert(
          '💾 නොබැඳිව සුරැකිණි (Saved Offline)',
          'ඔබගේ හදිසි ආධාර ඉල්ලීම මෙම දුරකථනයේ සුරැකිණි.\n\nදුරකථන සංඥා (Signal) හෝ අන්තර්ජාලය ලැබුණු සැනින් ස්වයංක්‍රීයව සහන කණ්ඩායම් වෙත යොමු කෙරේ.',
          [{ text: 'හරි (OK)' }]
        );
      }

      // Reset form fields
      setDisasterType(null);
      setOtherDisaster('');
      setSelectedNeeds([]);
      setOtherNeed('');
      setContactInfo('');
      setDescription('');
    } catch (error) {
      console.error('Error saving SOS offline:', error);
      Alert.alert('දෝෂයක්', 'ඉල්ලීම සුරැකීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToWelcome = () => {
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E24" />

      {/* --- Top Navigation & Status Bar --- */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.emergencyTag}>
            <Ionicons name="radio" size={14} color="#FFF" />
            <Text style={styles.emergencyTagText}>OFFLINE SOS MODE</Text>
          </View>
          <Text style={styles.headerTitle}>නොබැඳි හදිසි ආධාර</Text>
          <Text style={styles.headerSubtitle}>සිග්නල් නොමැති විට හදිසි උපකාර ඉල්ලීම</Text>
        </View>

        {/* Back to Welcome Button */}
        <TouchableOpacity
          style={styles.welcomeBtn}
          onPress={handleGoToWelcome}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="home" size={20} color="#FFF" />
          <Text style={styles.welcomeBtnText}>මුල් පිටුව</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* --- Connectivity & GPS Status Cards --- */}
        <View style={styles.statusCardsRow}>
          {/* Network Status Badge */}
          <View
            style={[
              styles.statusCard,
              { backgroundColor: isOnline ? '#1B5E20' : '#B71C1C' },
            ]}
          >
            <MaterialIcons
              name={isOnline ? 'wifi' : 'wifi-off'}
              size={18}
              color="#FFF"
            />
            <Text style={styles.statusCardText}>
              {isOnline ? 'සංඥා ඇත (Online)' : 'සංඥා නැත (Offline)'}
            </Text>
          </View>

          {/* Location Status Badge */}
          <TouchableOpacity
            style={[
              styles.statusCard,
              {
                backgroundColor:
                  locationStatus === 'done'
                    ? '#00695C'
                    : locationStatus === 'getting'
                    ? '#E65100'
                    : '#C62828',
              },
            ]}
            onPress={fetchLocation}
            activeOpacity={0.7}
          >
            {locationStatus === 'getting' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons
                name={locationStatus === 'done' ? 'location-on' : 'location-off'}
                size={18}
                color="#FFF"
              />
            )}
            <Text style={styles.statusCardText}>
              {locationStatus === 'done'
                ? 'GPS ලැබිණි'
                : locationStatus === 'getting'
                ? 'ස්ථානය සොයයි...'
                : 'GPS නැත (Tap)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- Queued Offline Requests Badge --- */}
        {offlineCount > 0 && (
          <View style={styles.queueBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons name="cloud-sync" size={24} color="#0D47A1" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.queueBannerTitle}>
                  සුරැකිව ඇති ඉල්ලීම්: {offlineCount} ක්
                </Text>
                <Text style={styles.queueBannerSub}>
                  {isOnline
                    ? 'සංඥා ලැබී ඇත. දැන්ම සර්වර් වෙත යොමු කරන්න.'
                    : 'සංඥා ලැබුණු සැනින් ස්වයංක්‍රීයව යවනු ලැබේ.'}
                </Text>
              </View>
            </View>
            {isOnline && (
              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={syncOfflineRequests}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.syncNowBtnText}>Sync</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* --- Step 1: Disaster Type Selection --- */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>සිදුවී ඇති ආපදාව කුමක්ද?</Text>
              <Text style={styles.sectionHelper}>ඔබ මුහුණ දී ඇති ආපදා වර්ගය තෝරන්න</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            {disasterOptions.map((opt) => {
              const isSelected = disasterType === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.gridCard,
                    isSelected && styles.disasterCardSelected,
                  ]}
                  onPress={() => setDisasterType(opt.id)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={28}
                    color={isSelected ? '#FFF' : '#E53935'}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={[
                      styles.gridCardTitle,
                      { color: isSelected ? '#FFF' : '#212121' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.gridCardSub,
                      { color: isSelected ? 'rgba(255,255,255,0.85)' : '#757575' },
                    ]}
                  >
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {disasterType === 'other' && (
            <TextInput
              style={styles.otherInput}
              placeholder="ආපදාව කුමක්දැයි සඳහන් කරන්න..."
              placeholderTextColor="#9E9E9E"
              value={otherDisaster}
              onChangeText={setOtherDisaster}
            />
          )}
        </View>

        {/* --- Step 2: Needs Selection --- */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepCircle, { backgroundColor: '#FF8F00' }]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>අවශ්‍ය ආධාර මොනවාද?</Text>
              <Text style={styles.sectionHelper}>අවශ්‍ය සියලුම ආධාර වර්ග තෝරන්න</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            {needsOptions.map((opt) => {
              const isSelected = selectedNeeds.includes(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.gridCard,
                    isSelected && styles.needsCardSelected,
                  ]}
                  onPress={() => toggleNeed(opt.id)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5
                    name={opt.icon}
                    size={24}
                    color={isSelected ? '#FFF' : '#F57C00'}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={[
                      styles.gridCardTitle,
                      { color: isSelected ? '#FFF' : '#212121' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedNeeds.includes('other') && (
            <TextInput
              style={styles.otherInput}
              placeholder="අවශ්‍ය වෙනත් දේ මෙහි සඳහන් කරන්න..."
              placeholderTextColor="#9E9E9E"
              value={otherNeed}
              onChangeText={setOtherNeed}
            />
          )}
        </View>

        {/* --- Step 3: Contact & Description Details --- */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepCircle, { backgroundColor: '#1E88E5' }]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>සම්බන්ධතා සහ අමතර විස්තර</Text>
              <Text style={styles.sectionHelper}>සහන කණ්ඩායම් වෙත ලබාදිය හැකි තොරතුරු</Text>
            </View>
          </View>

          {/* Contact info input */}
          <Text style={styles.fieldLabel}>නම / දුරකථන අංකය (විකල්ප):</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person-pin" size={20} color="#757575" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.textInput}
              placeholder="උදා: නිමල් - 0771234567"
              placeholderTextColor="#9E9E9E"
              value={contactInfo}
              onChangeText={setContactInfo}
            />
          </View>

          {/* Description input */}
          <Text style={styles.fieldLabel}>හදිසි තත්ත්වය පිළිබඳ විස්තර (විකල්ප):</Text>
          <TextInput
            style={styles.multilineInput}
            placeholder="උදා: වැඩිහිටියන් 2ක් සහ ළමුන් 1ක් ගෙදර වහල උඩ කොටුවී සිටී. පානීය ජලය නැත..."
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* --- Submit Button --- */}
        <TouchableOpacity
          style={[styles.sosSubmitBtn, isSubmitting && styles.sosSubmitBtnDisabled]}
          onPress={handleSubmitSos}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={styles.sosBtnContent}>
              <FontAwesome5 name="radiation" size={22} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.sosBtnText}>🚨 හදිසි ඉල්ලීම සුරකින්න / යවන්න</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* --- Footer Return Home Button --- */}
        <TouchableOpacity
          style={styles.returnWelcomeBtn}
          onPress={handleGoToWelcome}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="arrow-left-circle" size={22} color="#546E7A" />
          <Text style={styles.returnWelcomeText}>මුල් පිටුවට ආපසු යන්න (Welcome)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18191E',
  },
  topHeader: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 15,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flex: 1,
  },
  emergencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  emergencyTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B0BEC5',
    marginTop: 2,
  },
  welcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  welcomeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F1015',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusCard: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    elevation: 2,
  },
  statusCardText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#90CAF9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  queueBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  queueBannerSub: {
    fontSize: 11,
    color: '#1565C0',
    marginTop: 2,
  },
  syncNowBtn: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  syncNowBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D303E',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNum: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ECEFF1',
  },
  sectionHelper: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '31%',
    backgroundColor: '#242731',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#343847',
  },
  disasterCardSelected: {
    backgroundColor: '#D32F2F',
    borderColor: '#FF5252',
  },
  needsCardSelected: {
    backgroundColor: '#E65100',
    borderColor: '#FFA726',
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridCardSub: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  otherInput: {
    backgroundColor: '#242731',
    borderWidth: 1,
    borderColor: '#FFA000',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CFD8DC',
    marginBottom: 6,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242731',
    borderWidth: 1,
    borderColor: '#37474F',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  multilineInput: {
    backgroundColor: '#242731',
    borderWidth: 1,
    borderColor: '#37474F',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 75,
  },
  sosSubmitBtn: {
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  sosSubmitBtnDisabled: {
    backgroundColor: '#7F2B2B',
  },
  sosBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  returnWelcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  returnWelcomeText: {
    color: '#90A4AE',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
