import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { isAxiosError } from 'axios';
import { api } from '../services/api';
import SafeZoneMap from './safe-zone-map';
import type { DivisionBoundary, MapCoordinate, MapEvent, SafeMapHandle, SafeZone } from './safe-map-document';

type Division = { division_name: string; boundary: DivisionBoundary; zones: SafeZone[] };
function message(error: unknown) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;
  return typeof detail === 'string' ? detail : 'Unable to load or save safe zones. Please try again.';
}

export default function GnSafeZones() {
  const map = useRef<SafeMapHandle>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [location, setLocation] = useState<MapCoordinate | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'camp' | 'medical'>('camp');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(''); setLocation(null); setReady(false); setMapError(false);
    setDivision(null);
    try {
      const { data } = await api.get<Division>('/safe-zones/gn');
      if (!data.boundary || !['Polygon', 'MultiPolygon'].includes(data.boundary.type)) {
        throw new Error('Missing boundary');
      }
      setDivision(data);
    } catch (err) { setError(message(err)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const boundary = division?.boundary;
  useEffect(() => {
    if (ready && boundary) map.current?.send({ type: 'division', boundary });
  }, [ready, boundary]); // Keep the current view when a zone is saved.
  useEffect(() => {
    if (ready && division) map.current?.send({ type: 'update', zones: division.zones, location: null });
  }, [ready, division]);
  useEffect(() => {
    if (ready) map.current?.send({ type: 'draft', location });
  }, [ready, location]);
  useEffect(() => {
    if (!division || ready) return;
    const timeout = setTimeout(() => setMapError(true), 15000);
    return () => clearTimeout(timeout);
  }, [division, ready, mapKey]);

  const onEvent = useCallback((event: MapEvent) => {
    if (event.type === 'ready') setReady(true);
    if (event.type === 'error') setMapError(true);
    if (event.type === 'tiles-ok') setMapError(false);
    if (event.type === 'pick' && !saving) { setLocation(event.location); setNotice(''); }
    if (event.type === 'outside') setNotice('Choose a location inside your division boundary.');
    if (event.type === 'select') {
      const zone = division?.zones.find(item => item.id === event.id);
      if (zone) setNotice(`${zone.name} · ${zone.type === 'medical' ? 'Medical centre' : 'Safe camp'}`);
    }
  }, [saving, division]);

  async function save() {
    if (!location || !name.trim() || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const { data } = await api.post<SafeZone>('/safe-zones', { name: name.trim(), type, lat: location.latitude, lng: location.longitude });
      setDivision(current => current && ({ ...current, zones: [data, ...current.zones] }));
      setLocation(null); setName(''); setNotice('Safe zone saved successfully.');
    } catch (err) { setError(message(err)); }
    finally { setSaving(false); }
  }

  return <View style={styles.panel}>
    <Text style={styles.title}>Safe zones</Text>
    <Text style={styles.text}>{division?.division_name || 'Your GN division'} — tap inside your division to choose a safe zone location.</Text>
    {loading && <ActivityIndicator color="#2563eb" />}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!loading && !division && <TouchableOpacity onPress={load}><Text style={styles.link}>Retry loading division</Text></TouchableOpacity>}
    {division && <>
      <View style={styles.map}>
        <SafeZoneMap key={mapKey} ref={map} onEvent={onEvent} />
        {!ready && <View style={styles.cover}><ActivityIndicator color="#2563eb" /><Text>Loading division map…</Text></View>}
      </View>
      {mapError && <View><Text style={styles.error}>Map could not load fully. Check your internet connection.</Text><TouchableOpacity disabled={saving} onPress={() => { setReady(false); setMapError(false); setMapKey(key => key + 1); }}><Text style={styles.link}>Reload map</Text></TouchableOpacity></View>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.link}>{notice}</Text>}
      <Text style={styles.label}>Add a safe zone</Text>
      <Text style={styles.text}>{location ? `Selected: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Tap the map to place the orange location marker.'}</Text>
      <TextInput accessibilityLabel="Safe zone name" placeholder="Safe zone name" maxLength={200} value={name} onChangeText={setName} editable={!saving} style={styles.input} />
      <View style={styles.options}>{(['camp', 'medical'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: type === value }} disabled={saving} onPress={() => setType(value)} style={[styles.option, type === value && styles.selected]}><Text style={type === value ? styles.white : styles.text}>{value === 'camp' ? 'Safe camp' : 'Medical centre'}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity accessibilityRole="button" disabled={saving || !ready || !location || !name.trim()} onPress={save} style={[styles.save, (saving || !ready || !location || !name.trim()) && styles.disabled]}><Text style={styles.white}>{saving ? 'Saving…' : 'Save safe zone'}</Text></TouchableOpacity>
      <Text style={styles.label}>Safe zones in your division ({division.zones.length})</Text>
      <TouchableOpacity disabled={saving} onPress={load}><Text style={styles.link}>Refresh safe zones</Text></TouchableOpacity>
      {!division.zones.length && <Text style={styles.text}>No safe zones added yet.</Text>}
      {division.zones.map(zone => <View key={zone.id} style={styles.zone}><Text style={styles.label}>{zone.name}</Text><Text style={styles.text}>{zone.type === 'medical' ? 'Medical centre' : 'Safe camp'} · {zone.lat.toFixed(5)}, {zone.lng.toFixed(5)}</Text></View>)}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  text: { color: '#475569', lineHeight: 20 }, label: { color: '#0f172a', fontWeight: '700' },
  error: { color: '#b91c1c', lineHeight: 20 }, link: { color: '#1d4ed8', paddingVertical: 8 },
  map: { height: 390, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  cover: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', gap: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  options: { flexDirection: 'row', gap: 10 }, option: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  selected: { backgroundColor: '#2563eb' }, white: { color: 'white', fontWeight: '700' },
  save: { backgroundColor: '#047857', padding: 15, borderRadius: 10, alignItems: 'center' }, disabled: { opacity: 0.45 },
  zone: { paddingVertical: 10, gap: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
});
