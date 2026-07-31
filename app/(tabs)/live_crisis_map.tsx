import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


const BACKEND_URL = 'http://10.77.157.42:8004/api';

export default function CrisisMapScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ලංකාව මැදට වෙන්න Default Region එකක්
  const initialRegion = {
    latitude: 7.8731,
    longitude: 80.7718,
    latitudeDelta: 3.5, // මුළු ලංකාවම පේන Zoom Level එකක්
    longitudeDelta: 3.5,
  };

  useEffect(() => {
    fetchMapEvents();
  }, []);

  const fetchMapEvents = async () => {
    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // අර අපි අලුතින් හදපු Endpoint එකට කතා කරනවා
      const res = await axios.get(`${BACKEND_URL}/volunteer/events/active-map`, config);
      //console.log("Map Events:", JSON.stringify(res.data, null, 2)); // 👈 මේක දාලා බලන්න!
      setEvents(res.data);
    } catch (error) {
      console.error("Map Load Error:", error);
      Alert.alert("Error", "ආපදා තොරතුරු සිතියමට ලබාගැනීමට නොහැකි විය.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CC0000" />
          <Text style={{ marginTop: 10 }}>සිතියම සකසමින් පවතී...</Text>
        </View>
      ) : (
        <MapView style={styles.map} initialRegion={initialRegion}>
          
          {/* Backend එකෙන් එන Events ටික Loop කරලා Markers දානවා */}
          {events.map((event) => (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              pinColor="red"
            >
              {/* Pin එක එබුවම පේන විස්තර බබල් එක (Callout) */}
              <Callout style={styles.callout}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.eventTitle}>🚨 {event.title}</Text>
                  <Text style={styles.eventDistrict}>දිස්ත්‍රික්කය: {event.source_district}</Text>
                  <Text style={styles.eventDesc} numberOfLines={2}>
                    {event.description || "විස්තරයක් නැත."}
                  </Text>
                  
                  {/* අවශ්‍ය Skills මොනවද කියලත් පෙන්නමු */}
                  {event.requirements && event.requirements.length > 0 && (
                    <Text style={styles.reqText}>
                      අවශ්‍යතාවය: {event.requirements.map((r: any) => `${r.skill} (${r.required_count})`).join(', ')}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}

        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callout: { width: 220 },
  calloutContainer: { padding: 5 },
  eventTitle: { fontWeight: 'bold', fontSize: 14, color: '#CC0000', marginBottom: 3 },
  eventDistrict: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 3 },
  eventDesc: { fontSize: 11, color: '#555', marginBottom: 5 },
  reqText: { fontSize: 11, fontWeight: 'bold', color: '#007E33' }
});