import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Linking, Alert } from 'react-native';
import MapView, { Marker, type LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../services/api';

type SafeZone = { id: string; name: string; lat: number; lng: number; type: string };
const initialRegion = { latitude: 7.8731, longitude: 80.7718, latitudeDelta: 3.8, longitudeDelta: 3.8 };

export default function SafeMapScreen() {
  const map = useRef<MapView>(null);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [permission, setPermission] = useState(false);
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [selected, setSelected] = useState<SafeZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(useCallback(() => {
    // A refresh restarts both the tenant lookup and foreground location watcher.
    void refresh;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    let fetching = false;
    fitted.current = false;
    setZones([]);
    setSelected(null);
    setLoading(true);
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await api.get<SafeZone[]>('/safe-zones');
        if (active) {
          setZones(response.data);
          setSelected(previous => response.data.find(zone => zone.id === previous?.id) ?? null);
          setError('');
        }
      } catch (err: any) {
        if (active) {
          setZones([]); setSelected(null);
          setError(err.response?.status === 409 ? 'ඔබට සහන මධ්‍යස්ථානයක් පවරා නැත.' : 'ආරක්ෂිත ස්ථාන ලබාගත නොහැකි විය. නැවත උත්සාහ කරන්න.');
        }
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 30000);
    void (async () => {
      try {
        const granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
        if (!active) return;
        setPermission(granted);
        if (!granted) {
          setLocation(null);
          setLocationError('ඔබේ ස්ථානය බැලීමට Location අවසර ලබා දෙන්න.');
          return;
        }
        setLocationError('');
        setLocation(null);
        const watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 }, result => {
          if (active) { setLocation(result.coords); setLocationError(''); }
        });
        if (!active) watcher.remove(); else subscription = watcher;
      } catch {
        if (active) setLocationError('ඔබේ ස්ථානය ලබාගත නොහැක. GPS සක්‍රිය කර නැවත උත්සාහ කරන්න.');
      }
    })();
    return () => { active = false; clearInterval(timer); subscription?.remove(); };
  }, [refresh]));

  const fitZones = useCallback(() => {
    const points = zones.map(zone => ({ latitude: zone.lat, longitude: zone.lng }));
    if (location) points.push(location);
    if (points.length === 1) map.current?.animateToRegion({ ...points[0], latitudeDelta: 0.018, longitudeDelta: 0.018 }, 600);
    else if (points.length > 1) map.current?.fitToCoordinates(points, { edgePadding: { top: 110, right: 55, bottom: 210, left: 55 }, animated: true });
  }, [location, zones]);

  useEffect(() => {
    if (!ready || loading || fitted.current || (!zones.length && !location)) return;
    fitZones();
    // If GPS is still resolving, fit again once it arrives.
    if (location || locationError) fitted.current = true;
  }, [ready, loading, location, locationError, zones, fitZones]);

  const directions = async () => {
    if (!selected) return;
    const origin = location ? `&origin=${location.latitude},${location.longitude}` : '';
    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1${origin}&destination=${selected.lat},${selected.lng}`);
    } catch { Alert.alert('Directions', 'Maps විවෘත කළ නොහැකි විය. නැවත උත්සාහ කරන්න.'); }
  };

  return (
    <View style={styles.container}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={initialRegion}
        mapType="standard" showsUserLocation={permission} showsMyLocationButton={false}
        showsCompass onMapReady={() => setReady(true)}
        onPress={() => setSelected(null)}>
        {zones.map(zone => <Marker key={zone.id} coordinate={{ latitude: zone.lat, longitude: zone.lng }}
          title={zone.name} description={zone.type === 'medical' ? 'වෛද්‍ය මධ්‍යස්ථානය' : 'සහන කඳවුර'}
          pinColor={zone.type === 'medical' ? '#ef4444' : '#059669'}
          onPress={event => { event.stopPropagation(); setSelected(zone); }} />)}
      </MapView>
      <View style={styles.header}>
        <Text style={styles.title}>ආරක්ෂිත ස්ථාන</Text>
        <Text style={styles.subtitle}>ඔබේ සහන මධ්‍යස්ථානය එක් කළ ස්ථාන {zones.length}ක්</Text>
        <Text style={styles.legend}>🟢 සහන කඳවුරු   🔴 වෛද්‍ය මධ්‍යස්ථාන</Text>
        {loading && <ActivityIndicator color="#059669" style={{ marginTop: 8 }} />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!locationError && <Text style={styles.error}>{locationError}</Text>}
        {!loading && !error && !zones.length && <Text style={styles.subtitle}>තවමත් ආරක්ෂිත ස්ථාන එක් කර නැත.</Text>}
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityLabel="Show all safe zones" onPress={fitZones} style={styles.control}><FontAwesome5 name="expand" size={19} color="#0f172a" /></Pressable>
        <Pressable accessibilityLabel="My current location" onPress={() => {
          if (location) map.current?.animateToRegion({ ...location, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 500);
          else setRefresh(value => value + 1);
        }} style={styles.control}><FontAwesome5 name="location-arrow" size={19} color="#2563eb" /></Pressable>
        <Pressable accessibilityLabel="Refresh safe zones and location" onPress={() => setRefresh(value => value + 1)} style={styles.control}><FontAwesome5 name="sync-alt" size={18} color="#059669" /></Pressable>
      </View>
      {selected && <View style={styles.card}>
        <Text style={styles.title}>{selected.name}</Text>
        <Text style={styles.subtitle}>{selected.type === 'medical' ? 'වෛද්‍ය මධ්‍යස්ථානය' : 'සහන කඳවුර'}</Text>
        <Pressable style={styles.button} onPress={directions}><FontAwesome5 name="directions" color="white" size={20} /><Text style={styles.buttonText}>මාර්ගය බලන්න · Google Maps</Text></Pressable>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e2e8f0' },
  header: { position: 'absolute', top: 14, left: 14, right: 14, padding: 16, borderRadius: 18, backgroundColor: '#ffffff', elevation: 5, shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  title: { fontSize: 19, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 5 },
  legend: { fontSize: 12, color: '#475569', marginTop: 10 },
  error: { fontSize: 12, color: '#b91c1c', marginTop: 8 },
  controls: { position: 'absolute', right: 14, bottom: 175, gap: 10 },
  control: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  card: { position: 'absolute', bottom: 20, left: 14, right: 14, borderRadius: 18, padding: 18, backgroundColor: 'white', elevation: 6 },
  button: { marginTop: 14, borderRadius: 12, backgroundColor: '#059669', padding: 14, flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
