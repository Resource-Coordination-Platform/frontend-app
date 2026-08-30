import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { api } from '../../services/api';

export default function CrisisMapScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sri Lanka center region
  const initialRegion = {
    latitude: 7.8731,
    longitude: 80.7718,
    latitudeDelta: 3.5,
    longitudeDelta: 3.5,
  };

  useEffect(() => {
    fetchMapEvents();
  }, []);

  const fetchMapEvents = async () => {
    setIsLoading(true);
    try {
      // 1. Get events from backend
      const eventsRes = await api.get('/volunteer/events/active-map');
      setEvents(eventsRes.data);

      // 2. Get tenant relief centers from backend
      const tenantsRes = await api.get('/auth/tenants/locations');
      setTenants(tenantsRes.data);
    } catch (error) {
      console.error('Map Load Error:', error);
      Alert.alert('Error', 'ආපදා තොරතුරු සිතියමට ලබාගැනීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Top Header --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}> සජීවී ආපදා සිතියම</Text>
              <Text style={styles.headerSubtitle}>
                ක්‍රියාකාරී ආපදා සහ සහන මධ්‍යස්ථාන සිතියම
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={fetchMapEvents}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Floating Legend Bar --- */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>ආපදා ස්ථාන ({events.length})</Text>
          </View>
          <View style={styles.legendDivider} />
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#00897B' }]} />
            <Text style={styles.legendText}>සහන මධ්‍යස්ථාන ({tenants.length})</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00897B" />
            <Text style={styles.loadingText}>සිතියමේ දත්ත සකසමින් පවතී...</Text>
          </View>
        ) : (
          <MapView style={styles.map} initialRegion={initialRegion}>
            {/* 🔴 1. Disaster Events (Red Pins) */}
            {events.map(event => (
              <Marker
                key={`event-${event.id}`}
                coordinate={{
                  latitude: Number(event.latitude),
                  longitude: Number(event.longitude),
                }}
                pinColor="#DC2626"
              >
                <Callout style={styles.callout}>
                  <View style={styles.calloutContainer}>
                    <View style={styles.disasterBadge}>
                      <Text style={styles.disasterBadgeText}>🚨 ආපදාව</Text>
                    </View>
                    <Text style={styles.eventTitle}>{event.title || 'Disaster Incident'}</Text>
                    <Text style={styles.eventDistrict}>
                      📍 {event.source_district || 'District N/A'}
                    </Text>
                    <Text style={styles.eventDesc} numberOfLines={3}>
                      {event.description || 'විස්තරයක් සටහන් කර නොමැත.'}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}

            {/* 🟢 2. Tenant Relief Centers (Teal Pins) */}
            {tenants.map(tenant => (
              <Marker
                key={`tenant-${tenant.id}`}
                coordinate={{
                  latitude: Number(tenant.latitude),
                  longitude: Number(tenant.longitude),
                }}
                pinColor="#00897B"
              >
                <Callout style={styles.callout}>
                  <View style={styles.calloutContainer}>
                    <View style={styles.tenantBadge}>
                      <Text style={styles.tenantBadgeText}> සහන මධ්‍යස්ථානය</Text>
                    </View>
                    <Text style={styles.tenantTitle}>{tenant.name}</Text>
                    <Text style={styles.eventDesc} numberOfLines={3}>
                      {tenant.description || 'සහන මධ්‍යස්ථාන තොරතුරු.'}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#041F1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* --- Header --- */
  header: {
    backgroundColor: '#041F1A',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 12,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B2DFDB',
    marginTop: 3,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 137, 123, 0.4)',
    borderWidth: 1,
    borderColor: '#00897B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- Floating Legend --- */
  legendContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 95 : 75,
    left: 16,
    right: 16,
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  legendDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
  },

  /* --- Map & Loading --- */
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#00897B',
    fontWeight: '600',
  },

  /* --- Callout Info Boxes --- */
  callout: {
    width: 240,
  },
  calloutContainer: {
    padding: 6,
  },
  disasterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  disasterBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  tenantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  tenantBadgeText: {
    color: '#00695C',
    fontSize: 10,
    fontWeight: '800',
  },
  eventTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 2,
  },
  tenantTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: '#00695C',
    marginBottom: 2,
  },
  eventDistrict: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
  },
});