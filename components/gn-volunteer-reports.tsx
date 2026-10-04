import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { isAxiosError } from 'axios';
import { api } from '../services/api';

type Report = {
  id: string; category: string; severity: string; description: string | null;
  latitude: number; longitude: number; image_url: string | null;
  volunteer_name: string | null; volunteer_phone: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'; created_at: string;
  gn_review_note: string | null; gn_reviewed_at: string | null;
};

function message(error: unknown) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;
  return typeof detail === 'string' ? detail : 'Unable to load reports. Please retry.';
}

export default function GnVolunteerReports() {
  const [rows, setRows] = useState<Report[]>([]);
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/volunteer/reports/gn'); setRows(data.reports); setError(''); }
    catch (err) { setError(message(err)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function review(row: Report, status: 'VERIFIED' | 'REJECTED') {
    if (status === 'REJECTED' && !notes[row.id]?.trim()) {
      Alert.alert('Decline reason required', 'Explain why this report is declined.'); return;
    }
    setBusy(row.id);
    try {
      await api.patch(`/volunteer/reports/${row.id}/status`, { status, note: notes[row.id] || '' });
      await load();
    } catch (err) { Alert.alert('Review failed', message(err)); }
    finally { setBusy(null); }
  }
  const pending = rows.filter(row => row.status === 'PENDING').length;
  const visible = rows.filter(row => history ? row.status !== 'PENDING' : row.status === 'PENDING');
  return <View style={styles.container}>
    <Text style={styles.title}>Volunteer reports</Text>
    <Text>Reports from locations inside your GN division. Verified reports go to the nearest assigned relief centre.</Text>
    <View style={styles.actions}>
      {[false, true].map(value => <TouchableOpacity key={String(value)} accessibilityRole="tab" accessibilityState={{ selected: history === value }} onPress={() => setHistory(value)} style={[styles.tab, history === value && styles.selected]}><Text>{value ? `History (${rows.length - pending})` : `Pending (${pending})`}</Text></TouchableOpacity>)}
      <TouchableOpacity disabled={loading || !!busy} onPress={load}><Text style={styles.link}>Refresh</Text></TouchableOpacity>
    </View>
    {!!error && <Text style={styles.error}>{error}</Text>}
    {loading && <ActivityIndicator />}
    {!loading && !error && !visible.length && <Text>{history ? 'No reviewed reports yet.' : 'No reports awaiting verification.'}</Text>}
    {visible.map(row => <View key={row.id} style={styles.card}>
      <Text style={styles.title}>{row.category} · {row.severity}</Text>
      <Text>{row.volunteer_name || 'Volunteer'}{row.volunteer_phone ? ` · ${row.volunteer_phone}` : ''}</Text>
      <Text>{new Date(row.created_at).toLocaleString()}</Text>
      <Text selectable>Report: {row.id}</Text>
      <Text>{row.description || 'No additional details.'}</Text>
      {!!row.image_url && <Image accessibilityLabel="Report photo evidence" source={{ uri: row.image_url }} style={styles.photo} resizeMode="contain" />}
      <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${row.latitude},${row.longitude}`).catch(() => Alert.alert('Unable to open map'))}><Text style={styles.link}>View location: {row.latitude}, {row.longitude}</Text></TouchableOpacity>
      {row.status === 'PENDING' ? <>
        <TextInput accessibilityLabel="Report review note or decline reason" placeholder="Review note / decline reason" multiline maxLength={2000} style={styles.input} value={notes[row.id] || ''} onChangeText={text => setNotes(current => ({ ...current, [row.id]: text }))} />
        <View style={styles.actions}>
          <TouchableOpacity disabled={!!busy || !!error || loading} style={[styles.button, { backgroundColor: '#047857' }]} onPress={() => Alert.alert('Verify report?', 'This report will be released to the assigned relief centre admin.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Verify', onPress: () => void review(row, 'VERIFIED') }])}><Text style={styles.white}>{busy === row.id ? 'Saving…' : 'Verify'}</Text></TouchableOpacity>
          <TouchableOpacity disabled={!!busy || !!error || loading} style={[styles.button, { backgroundColor: '#b91c1c' }]} onPress={() => void review(row, 'REJECTED')}><Text style={styles.white}>Decline</Text></TouchableOpacity>
        </View>
      </> : <View style={styles.result}>
        <Text style={{ fontWeight: '700' }}>{row.status === 'VERIFIED' ? 'Verified · sent to tenant admin' : 'Declined'}</Text>
        {!!row.gn_reviewed_at && <Text>{new Date(row.gn_reviewed_at).toLocaleString()}</Text>}
        {!!row.gn_review_note && <Text>{row.gn_review_note}</Text>}
      </View>}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 14 }, title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  tab: { padding: 12, borderRadius: 10, backgroundColor: '#e2e8f0' }, selected: { backgroundColor: '#bfdbfe' },
  card: { padding: 18, borderRadius: 18, backgroundColor: 'white', gap: 10 },
  photo: { width: '100%', height: 220, borderRadius: 10 }, link: { color: '#1d4ed8', paddingVertical: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, minHeight: 64, textAlignVertical: 'top' },
  button: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' }, white: { color: 'white', fontWeight: '700' },
  result: { backgroundColor: '#e2e8f0', padding: 12, borderRadius: 10, gap: 6 }, error: { color: '#b91c1c' },
});
