import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


const VOLUNTEER_BACKEND_URL = 'http://10.77.157.42:8004/api';
const IAM_BACKEND_URL = 'http://10.77.157.42:8001/api'; // IAM Service URL එක (Port 8001)

export default function CrisisMapScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
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

      // 1. Events ටික ගන්නවා (Red Pins)
      const eventsRes = await axios.get(`${VOLUNTEER_BACKEND_URL}/volunteer/events/active-map`, config);
      setEvents(eventsRes.data);


      // 2. Tenants ලගේ Locations ටික ගන්නවා (Blue Pins)
      const tenantsRes = await axios.get(`${IAM_BACKEND_URL}/auth/tenants/locations`, config);
      setTenants(tenantsRes.data);

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
          
          {/* 🔴 1. Disaster Events (Red Pins) */}
          {events.map((event) => (
            <Marker
              key={`event-${event.id}`}
              coordinate={{
                latitude: Number(event.latitude),
                longitude: Number(event.longitude),
              }}
              pinColor="red"
            >
              <Callout style={styles.callout}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.eventTitle}>🚨 {event.title}</Text>
                  <Text style={styles.eventDistrict}>දිස්ත්‍රික්කය: {event.source_district}</Text>
                  <Text style={styles.eventDesc} numberOfLines={2}>
                    {event.description || "විස්තරයක් නැත."}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}

          {/* 🔵 2. Tenant Organizations / Relief Centers (Blue Pins) */}
          {tenants.map((tenant) => (
            <Marker
              key={`tenant-${tenant.id}`}
              coordinate={{
                latitude: Number(tenant.latitude),
                longitude: Number(tenant.longitude),
              }}
              pinColor="blue" // නිල් පාටින් පෙන්වනවා
            >
              <Callout style={styles.callout}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.tenantTitle}>🏢 {tenant.name}</Text>
                  <Text style={styles.tenantBadge}>සහන මධ්‍යස්ථානය / සංවිධානය</Text>
                  <Text style={styles.eventDesc} numberOfLines={3}>
                    {tenant.description || "විස්තර ලබා දී නොමැත."}
                  </Text>
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
  tenantTitle: { fontWeight: 'bold', fontSize: 14, color: '#0066CC', marginBottom: 3 },
  tenantBadge: { fontSize: 11, fontWeight: 'bold', color: '#008000', marginBottom: 4 },
  eventDistrict: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 3 },
  eventDesc: { fontSize: 11, color: '#555' }
});