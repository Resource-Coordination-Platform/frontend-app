import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export function DirectionsButton({ latitude, longitude, destination, title = 'යා යුතු ස්ථානය' }: {
  latitude?: number | null;
  longitude?: number | null;
  destination?: string;
  title?: string;
}) {
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const valid = typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;

  const open = async () => {
    if (!valid || busy.current) return;
    busy.current = true;
    setLoading(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      let origin = '';
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 8000); }),
          ]);
          if (position) origin = `&origin=${position.coords.latitude},${position.coords.longitude}`;
        }
      } catch { /* Maps can resolve the current starting location itself. */ }
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1${origin}&destination=${latitude},${longitude}`);
    } catch {
      Alert.alert('මාර්ගය විවෘත කළ නොහැක', 'නැවත උත්සාහ කරන්න.');
    } finally {
      if (timer) clearTimeout(timer);
      busy.current = false;
      setLoading(false);
    }
  };

  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${title}${destination ? `: ${destination}` : ''}`}
    accessibilityState={{ disabled: !valid || loading, busy: loading }} disabled={!valid || loading}
    onPress={() => void open()} activeOpacity={0.75} style={[styles.button, !valid && styles.disabled]}>
    {loading ? <ActivityIndicator color="#0369a1" /> : <MaterialCommunityIcons name="map-marker-path" size={25} color="#0369a1" />}
    <View style={styles.text}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{!valid ? 'මෙම ඉල්ලීමට ස්ථානයක් එක් කර නැත' : loading ? 'මාර්ගය විවෘත කරමින්…' : destination || 'ඔබ සිටින තැන සිට මාර්ගය බලන්න'}</Text>
    </View>
    {valid && <MaterialCommunityIcons name="directions" size={22} color="#0369a1" />}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 12, padding: 14, marginVertical: 8 },
  disabled: { opacity: 0.6 },
  text: { flex: 1 },
  title: { color: '#075985', fontWeight: '700', fontSize: 14 },
  subtitle: { color: '#0369a1', fontSize: 12, marginTop: 4 },
});
