import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';

export default function EventsFeed() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/volunteer/events');
      setEvents(response.data);
    } catch (error: any) {
      if (error.response) {
        console.error('Backend Error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Server Unreachable:', error.request);
      } else {
        console.error('Error:', error.message);
      }
      Alert.alert('Error', 'ආපදා තොරතුරු ලබා ගැනීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const getSeverityData = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return { color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA', label: 'CRITICAL' };
      case 'HIGH':
        return { color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FFEDD5', label: 'HIGH' };
      case 'MEDIUM':
        return { color: '#D97706', bgColor: '#FFFBEB', borderColor: '#FEF3C7', label: 'MEDIUM' };
      default:
        return { color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0', label: severity || 'LOW' };
    }
  };

  const getDisasterIcon = (title: string = '') => {
    const t = title.toLowerCase();
    if (t.includes('flood') || t.includes('water')) return { name: 'water', iconFamily: 'FontAwesome5' };
    if (t.includes('fire')) return { name: 'fire', iconFamily: 'FontAwesome5' };
    if (t.includes('landslide')) return { name: 'mountain', iconFamily: 'FontAwesome5' };
    if (t.includes('storm') || t.includes('wind')) return { name: 'wind', iconFamily: 'FontAwesome5' };
    return { name: 'exclamation-triangle', iconFamily: 'FontAwesome5' };
  };

  const renderEventItem = ({ item }: { item: any }) => {
    const sev = getSeverityData(item.severity);
    const disasterIcon = getDisasterIcon(item.title);

    return (
      <View style={[styles.card, { borderLeftColor: sev.color }]}>
        <View style={styles.cardTopRow}>
          <View style={styles.titleGroup}>
            <View style={[styles.iconBox, { backgroundColor: sev.bgColor }]}>
              <FontAwesome5 name={disasterIcon.name as any} size={16} color={sev.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>
                {item.title ? item.title.replace(/_/g, ' ').toUpperCase() : 'EMERGENCY EVENT'}
              </Text>
              <Text style={styles.eventSubDate}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : 'සක්‍රීය ආපදාව'}
              </Text>
            </View>
          </View>

          <View style={[styles.severityPill, { backgroundColor: sev.bgColor, borderColor: sev.borderColor }]}>
            <Text style={[styles.severityText, { color: sev.color }]}>{sev.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Location & Status Pills */}
        <View style={styles.detailsRow}>
          <View style={styles.locationPill}>
            <MaterialIcons name="place" size={16} color="#00897B" />
            <Text style={styles.locationText}>
              {item.source_district || 'District Not Specified'}
              {item.city ? ` • ${item.city}` : ''}
            </Text>
          </View>

          {item.status && (
            <View style={styles.statusPill}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#64748B" />
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() =>
            Alert.alert(
              item.title || 'Event Details',
              `ප්‍රදේශය: ${item.source_district || 'N/A'}\nනගරය: ${item.city || 'N/A'}\nභයානකකම: ${item.severity}\nතත්ත්වය: ${item.status || 'Active'}\n\n${item.description || 'විස්තර ලබා දී නොමැත.'}`
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.viewBtnText}>විස්තර බලන්න (View Details)</Text>
          <MaterialIcons name="chevron-right" size={18} color="#00897B" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Top Header (Teal Theme) --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}> ආපදා තොරතුරු</Text>
              <Text style={styles.headerSubtitle}>දිවයින පුරා සිදුවන ආපදාවන්ගේ සජීවී යාවත්කාලීන</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{events.length} Events</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00897B" />
            <Text style={styles.loadingText}>ආපදා තොරතුරු ලබාගනිමින් පවතී...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <FontAwesome5 name="shield-alt" size={38} color="#00897B" />
            </View>
            <Text style={styles.emptyTitle}>දැනට කිසිදු ආපදා තත්ත්වයක් වාර්තා වී නොමැත</Text>
            <Text style={styles.emptySub}>සියලු ප්‍රදේශ සාමකාමීව පවතී. පරෙස්සමින් ඉන්න! 🌿</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={renderEventItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#00897B']}
                tintColor="#00897B"
              />
            }
          />
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
  centerContainer: {
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

  /* --- Header --- */
  header: {
    backgroundColor: '#041F1A',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 35 : 12,
    paddingBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
  countBadge: {
    backgroundColor: 'rgba(0, 137, 123, 0.3)',
    borderWidth: 1,
    borderColor: '#00897B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  countText: {
    color: '#E0F2F1',
    fontSize: 11,
    fontWeight: '800',
  },

  /* --- List Content --- */
  listContent: {
    padding: 16,
    paddingBottom: 25,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  eventSubDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00695C',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginVertical: 6,
  },
  viewBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00897B',
  },

  /* --- Empty State --- */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});