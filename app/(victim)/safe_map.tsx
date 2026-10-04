import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Linking, Alert } from 'react-native';
import SafeZoneMap from '../../components/safe-zone-map';
import type { DivisionBoundary, MapCoordinate, MapEvent, SafeMapHandle, SafeZone } from '../../components/safe-map-document';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../services/api';

export default function SafeMapScreen() {
  const map = useRef<SafeMapHandle>(null);
  const [division, setDivision] = useState<{ division_name: string; boundary: DivisionBoundary } | null>(null);
  const [ready, setReady] = useState(false);
  const [divisionReady, setDivisionReady] = useState(false);
  const [location, setLocation] = useState<MapCoordinate | null>(null);
  const [mapError, setMapError] = useState('');
  const [mapVersion, setMapVersion] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [selected, setSelected] = useState<SafeZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(useCallback(() => {
    // Resolve the saved registration division, independent of current GPS.
    void refresh;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    let fetching = false;
    setDivision(null);
    setReady(false);
    setDivisionReady(false);
    setMapError('');
    setZones([]);
    setSelected(null);
    setLoading(true);
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await api.get<{ division_name: string; boundary: DivisionBoundary; zones: SafeZone[] }>('/safe-zones/victim');
        if (!response.data.boundary || !['Polygon', 'MultiPolygon'].includes(response.data.boundary.type)) {
          throw new Error('Missing GN boundary');
        }
        if (active) {
          setDivision(previous => previous && JSON.stringify(previous.boundary) === JSON.stringify(response.data.boundary)
            ? { ...previous, division_name: response.data.division_name }
            : { division_name: response.data.division_name, boundary: response.data.boundary });
          setZones(response.data.zones);
          setSelected(previous => response.data.zones.find(zone => zone.id === previous?.id) ?? null);
          setError('');
        }
      } catch (err: any) {
        if (active) {
          setZones([]); setSelected(null);
          setError(err.response?.status === 409 ? 'ඔබගේ ලියාපදිංචි ස්ථානය සොයාගත නොහැක.' : 'ඔබගේ GN කොට්ඨාසය සහ ආරක්ෂිත ස්ථාන ලබාගත නොහැකි විය. නැවත උත්සාහ කරන්න.');
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
    if (division) map.current?.send({ type: 'division', boundary: division.boundary, readOnly: true });
  }, [division]);

  const boundary = division?.boundary;
  useEffect(() => {
    if (ready && boundary) map.current?.send({ type: 'division', boundary, readOnly: true });
  }, [ready, boundary]);

  useEffect(() => {
    if (ready) map.current?.send({ type: 'update', zones, location });
  }, [ready, zones, location]);

  useEffect(() => {
    if (divisionReady || !division) return;
    const timeout = setTimeout(() => setMapError('සිතියම පූරණය කළ නොහැක. අන්තර්ජාල සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.'), 15000);
    return () => clearTimeout(timeout);
  }, [divisionReady, mapVersion, division]);

  const onMapEvent = useCallback((event: MapEvent) => {
    if (event.type === 'ready') { setReady(true); setMapError(''); }
    else if (event.type === 'division-ready') setDivisionReady(true);
    else if (event.type === 'select') setSelected(zones.find(zone => zone.id === event.id) ?? null);
    else if (event.type === 'clear') setSelected(null);
    else if (event.type === 'outside') Alert.alert('GN කොට්ඨාසය', 'ඔබගේ වත්මන් ස්ථානය ලියාපදිංචි GN කොට්ඨාසයෙන් පිටත පිහිටා ඇත.');
    else if (event.type === 'tiles-ok') setMapError('');
    else if (event.type === 'error') setMapError('සිතියම පූරණය කළ නොහැක. අන්තර්ජාල සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.');
  }, [zones]);

  const refreshMap = () => {
    if (mapError || !ready) {
      setReady(false);
      setDivisionReady(false);
      setMapError('');
      setMapVersion(value => value + 1);
    }
    setRefresh(value => value + 1);
  };

  const directions = async () => {
    if (!selected) return;
    const origin = location ? `${location.latitude},${location.longitude}` : '';
    const route = encodeURIComponent(`${origin};${selected.lat},${selected.lng}`);
    try {
      await Linking.openURL(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${route}`);
    } catch { Alert.alert('Directions', 'Maps විවෘත කළ නොහැකි විය. නැවත උත්සාහ කරන්න.'); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ආරක්ෂිත ස්ථාන</Text>
        <Text style={styles.divisionLabel}>ඔබ අයත් GN කොට්ඨාසය</Text>
        <Text style={styles.divisionName}>{division?.division_name || 'කොට්ඨාසය සොයමින්...'}</Text>
        <Text style={styles.subtitle}>ආරක්ෂිත ස්ථාන {zones.length}ක් · ඔබගේ කොට්ඨාසය තුළ පමණි</Text>
        <Text style={styles.legend}>🟢 සහන කඳවුරු   🔴 වෛද්‍ය මධ්‍යස්ථාන</Text>
        {(loading || (division && !divisionReady && !mapError)) && <ActivityIndicator color="#059669" style={{ marginTop: 8 }} />}
        {!!mapError && <Text accessibilityRole="alert" style={styles.error}>{mapError}</Text>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!locationError && <Text style={styles.error}>{locationError}</Text>}
        {!loading && !error && !zones.length && <Text style={styles.subtitle}>තවමත් ආරක්ෂිත ස්ථාන එක් කර නැත.</Text>}
      </View>
      <View style={styles.mapFrame}>
      {division && <SafeZoneMap key={mapVersion} ref={map} onEvent={onMapEvent} />}
      {division && !divisionReady && <View style={styles.mapCover} />}
      <View style={[styles.controls, { bottom: selected ? cardHeight + 30 : 24 }]}>
        <Pressable accessibilityLabel="Show my GN division" onPress={fitZones} style={styles.control}><FontAwesome5 name="expand" size={19} color="#0f172a" /></Pressable>
        <Pressable accessibilityLabel="My current location" onPress={() => {
          if (location && ready) map.current?.send({ type: 'locate', location });
          else refreshMap();
        }} style={styles.control}><FontAwesome5 name="location-arrow" size={19} color="#2563eb" /></Pressable>
        <Pressable accessibilityLabel="Refresh safe zones and location" onPress={refreshMap} style={styles.control}><FontAwesome5 name="sync-alt" size={18} color="#059669" /></Pressable>
      </View>
      {selected && <View style={styles.card} onLayout={event => setCardHeight(event.nativeEvent.layout.height)}>
        <Text style={styles.title}>{selected.name}</Text>
        <Text style={styles.subtitle}>{selected.type === 'medical' ? 'වෛද්‍ය මධ්‍යස්ථානය' : 'සහන කඳවුර'}</Text>
        <Pressable style={styles.button} onPress={directions}><FontAwesome5 name="directions" color="white" size={20} /><Text style={styles.buttonText}>මාර්ගය බලන්න · OpenStreetMap</Text></Pressable>
      </View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e2e8f0' },
  mapCover: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#e2e8f0' },
  header: { margin: 14, marginBottom: 10, padding: 16, borderRadius: 18, backgroundColor: '#ffffff', elevation: 5, shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  mapFrame: { flex: 1, marginHorizontal: 14, marginBottom: 14, borderRadius: 18, overflow: 'hidden' },
  divisionLabel: { fontSize: 12, color: '#475569', marginTop: 12 },
  divisionName: { fontSize: 21, fontWeight: '800', color: '#1d4ed8', marginTop: 4 },
  title: { fontSize: 19, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 5 },
  legend: { fontSize: 12, color: '#475569', marginTop: 10 },
  error: { fontSize: 12, color: '#b91c1c', marginTop: 8 },
  controls: { position: 'absolute', right: 14, bottom: 175, gap: 10 },
  control: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  card: { position: 'absolute', bottom: 20, left: 14, right: 14, borderRadius: 18, padding: 18, backgroundColor: 'white', elevation: 6 },
  button: { marginTop: 14, borderRadius: 12, backgroundColor: '#059669', padding: 14, flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { flexShrink: 1, textAlign: 'center', color: 'white', fontWeight: '700', fontSize: 14 },
});
