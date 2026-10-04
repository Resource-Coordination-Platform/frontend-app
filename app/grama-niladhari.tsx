import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import { api, clearAuthTokens, getUserRole } from '../services/api';
import GnVolunteerReports from '../components/gn-volunteer-reports';
import GnSafeZones from '../components/gn-safe-zones';

type Request = {
  id: string; victim_id: string | null; description: string; disaster_type: string | null;
  latitude: number; longitude: number; created_at: string;
  requester_name?: string; requester_phone?: string; area?: string;
  gn_review_status: string | null; gn_review_note?: string; account_request_count: number;
  status: string;
  requested_items: { code: string; label: string; quantity: number | null; unit: string }[];
};

function errorMessage(error: unknown) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
  return typeof detail === 'string' ? detail : 'Unable to connect. Please try again.';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    COMPLETED: 'Delivery completed', FULFILLED: 'Fulfilled', RESERVED: 'Supplies reserved',
    OPEN: 'Awaiting a volunteer', ASSIGNED: 'Volunteer assigned', COLLECTED: 'Supplies collected',
    IN_TRANSIT: 'Delivery in progress', DELIVERED: 'Delivered',
  };
  return labels[status] || status.toLowerCase().replace(/_/g, ' ');
}

export default function GramaNiladhariDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Request[]>([]);
  const [division, setDivision] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if ((await getUserRole()) !== 'GRAMA_NILADHARI') { router.replace('/'); return; }
      const { data } = await api.get('/requests/gn');
      setRows(data.requests); setDivision(data.division_name); setError('');
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [router]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function review(row: Request, decision: 'verified' | 'rejected') {
    if (decision === 'rejected' && !notes[row.id]?.trim()) {
      Alert.alert('Rejection reason required', 'Add a note explaining why this request is rejected.'); return;
    }
    setBusy(row.id);
    try {
      await api.post(`/requests/gn/${row.id}/review`, { decision, note: notes[row.id] || '' });
      await load();
    } catch (err) { Alert.alert('Review failed', errorMessage(err)); }
    finally { setBusy(null); }
  }

  const visible = rows.filter(row => tab === 'pending' ? row.gn_review_status === 'pending' : row.gn_review_status !== 'pending');
  const pendingCount = rows.filter(row => row.gn_review_status === 'pending').length;
  const historyCount = rows.length - pendingCount;
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" refreshControl={['safe-zones', 'reports'].includes(tab) ? undefined : <RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>RELIEF COORDINATION</Text><Text style={styles.title}>Grama Niladhari</Text><Text style={styles.muted}>{division || 'Your GN division'}</Text></View>
        <TouchableOpacity accessibilityRole="button" onPress={async () => { await clearAuthTokens(); router.replace('/login'); }}><Text style={styles.link}>Sign out</Text></TouchableOpacity></View>
      <View style={styles.summary}><Text style={styles.count}>{pendingCount}</Text><Text style={styles.summaryText}>Requests awaiting your review</Text><Text style={styles.summaryText}>{rows.length} requests shown · {pendingCount} pending · {historyCount} in history</Text><Text style={styles.summaryText}>Only locations inside your saved GN boundary appear here.</Text></View>
      <View style={styles.tabs}>{['pending', 'reviewed', 'reports', 'safe-zones'].map(value => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: value === tab }} onPress={() => setTab(value)} style={[styles.tab, value === tab && styles.activeTab]}><Text style={value === tab ? styles.white : styles.link}>{value === 'pending' ? `Pending (${pendingCount})` : value === 'reviewed' ? `History (${historyCount})` : value === 'reports' ? 'Reports' : 'Safe Zones'}</Text></TouchableOpacity>)}</View>
      {tab === 'reports' ? <GnVolunteerReports /> : tab === 'safe-zones' ? <GnSafeZones /> : <>
      {!!error && <View style={styles.warning}><Text>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.link}>Retry</Text></TouchableOpacity></View>}
      {loading && rows.length === 0 && <ActivityIndicator color="#2563eb" />}
      {tab === 'reviewed' && <Text style={styles.muted}>Your GN reviews and earlier processed victim requests in this division. Earlier requests cannot be reviewed again.</Text>}
      {!loading && !error && !visible.length && <Text style={styles.empty}>{tab === 'pending' ? 'No requests awaiting review in your GN division.' : 'No request history in your GN division.'}</Text>}
      {visible.map(row => <View key={row.id} style={[styles.card, row.account_request_count > 1 && styles.repeated]}>
        {row.account_request_count > 1 && <Text style={styles.duplicate}>Same account: {row.account_request_count} requests in this division. Check earlier requests before verifying.</Text>}
        <Text style={styles.cardTitle}>{row.requester_name || (row.victim_id ? `Victim ${row.victim_id.slice(0, 8)}` : 'Victim request')}</Text>
        <Text selectable style={styles.muted}>Account: {row.victim_id || 'Unavailable'}</Text>
        <Text selectable style={styles.muted}>Request: {row.id}</Text>
        <Text style={styles.muted}>{new Date(row.created_at).toLocaleString()} · {row.disaster_type}</Text>
        <Text style={styles.description}>{row.description || 'No additional details provided.'}</Text>
        {row.requested_items.map((item, index) => <View key={`${item.code}-${index}`} style={styles.item}><Text style={{ flex: 1 }}>{item.label}</Text><Text style={{ fontWeight: '700' }}>{item.quantity == null ? 'Quantity not recorded' : `${item.quantity} ${item.unit}`}</Text></View>)}
        {!!row.area && <Text>{row.area}</Text>}
        <Text selectable style={styles.muted}>Location: {row.latitude}, {row.longitude}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${row.latitude},${row.longitude}`).catch(() => Alert.alert('Unable to open map'))}><Text style={styles.link}>Open victim location on map ↗</Text></TouchableOpacity>
        {!!row.requester_phone && <Text selectable style={styles.link}>Phone: {row.requester_phone}</Text>}
        {row.gn_review_status === 'pending' ? <>
          <TextInput accessibilityLabel="Review note or rejection reason" placeholder="Review note / rejection reason" multiline value={notes[row.id] || ''} onChangeText={text => setNotes(current => ({ ...current, [row.id]: text }))} style={styles.input} />
          <View style={styles.actions}><TouchableOpacity disabled={!!busy || !!error} style={[styles.button, { backgroundColor: '#047857', opacity: busy ? 0.5 : 1 }]} onPress={() => Alert.alert('Verify request?', 'This request will be sent to your tenant admin.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Verify', onPress: () => void review(row, 'verified') }])}><Text style={styles.white}>{busy === row.id ? 'Saving…' : 'Verify'}</Text></TouchableOpacity>
            <TouchableOpacity disabled={!!busy || !!error} style={[styles.button, { backgroundColor: '#b91c1c', opacity: busy ? 0.5 : 1 }]} onPress={() => void review(row, 'rejected')}><Text style={styles.white}>Reject</Text></TouchableOpacity></View>
        </> : <View style={styles.review}><Text style={{ fontWeight: '700' }}>{row.gn_review_status === 'verified' ? 'Verified · sent to tenant admin' : row.gn_review_status === 'rejected' ? 'Rejected' : 'Earlier request · no GN review recorded'}</Text><Text>Current status: {statusLabel(row.status)}</Text>{!!row.gn_review_note && <Text>{row.gn_review_note}</Text>}</View>}
      </View>)}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' }, page: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, eyebrow: { color: '#2563eb', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 26, color: '#0f172a', fontWeight: '800', marginVertical: 6 }, muted: { color: '#64748b', fontSize: 12 },
  link: { color: '#1d4ed8', fontWeight: '600', paddingVertical: 8 }, summary: { backgroundColor: '#17376b', borderRadius: 20, padding: 20, gap: 6 },
  count: { fontSize: 36, color: 'white', fontWeight: '800' }, summaryText: { color: '#dbeafe', fontSize: 13 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tab: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12 }, activeTab: { backgroundColor: '#2563eb' },
  white: { color: 'white', fontWeight: '700', paddingVertical: 8 }, warning: { padding: 16, backgroundColor: '#fff1f2', borderRadius: 12 },
  empty: { textAlign: 'center', color: '#64748b', paddingVertical: 30 }, card: { backgroundColor: 'white', borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  repeated: { borderColor: '#f59e0b', borderWidth: 2, backgroundColor: '#fffbeb' }, duplicate: { color: '#92400e', fontWeight: '700', fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' }, description: { fontSize: 15, lineHeight: 22, color: '#334155' },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, minHeight: 64, textAlignVertical: 'top', backgroundColor: 'white' },
  actions: { flexDirection: 'row', gap: 10 }, button: { flex: 1, alignItems: 'center', borderRadius: 10, padding: 4 }, review: { padding: 12, backgroundColor: '#e2e8f0', borderRadius: 10, gap: 6 },
});
