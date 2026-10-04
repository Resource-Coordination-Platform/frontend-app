import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DeliveryCard } from '../../components/delivery-card';
import { useVolunteerTabs } from '../../services/volunteer-tabs';

export default function DeliveriesScreen() {
  const { deliveries: { data, loading, error, refresh } } = useVolunteerTabs();
  const openCount = data.filter(d => d.status === 'OPEN').length;
  const activeCount = data.filter(d => ['ACCEPTED', 'COLLECTED', 'EN_ROUTE', 'CODE_VERIFIED'].includes(d.status)).length;
  const completedCount = data.filter(d => d.status === 'COMPLETED').length;

  const sortedDeliveries = useMemo(() => {
    const getStatusWeight = (status: string) => {
      // 1. In-progress / Doing right now (thaman dn karamin inna ewa udatama)
      if (['EN_ROUTE', 'CODE_VERIFIED'].includes(status)) return 1;
      if (status === 'COLLECTED') return 2;
      if (status === 'ACCEPTED') return 3;
      // 2. New invitations awaiting response (aluthma ewa udata)
      if (status === 'OPEN') return 4;
      // 3. Completed deliveries (bedahareema sampurna karapu ewa yatata)
      if (status === 'COMPLETED') return 5;
      return 6;
    };

    return [...data].sort((a, b) => {
      const weightA = getStatusWeight(a.status);
      const weightB = getStatusWeight(b.status);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [data]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>

      {/* --- Header --- */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
        </View>

        {/* Status Counts */}
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <MaterialCommunityIcons name="bell-ring" size={14} color="#FDE047" />
            <Text style={styles.statText}>නව ආරාධනා: {openCount}</Text>
          </View>
          <View style={styles.statBadge}>
            <MaterialCommunityIcons name="progress-clock" size={14} color="#A7F3D0" />
            <Text style={styles.statText}>ක්‍රියාකාරී: {activeCount}</Text>
          </View>
          {completedCount > 0 && (
            <View style={[styles.statBadge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#86EFAC" />
              <Text style={styles.statText}>සම්පූර්ණයි: {completedCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* --- Error Banner --- */}
      {error && (
        <TouchableOpacity onPress={() => void refresh()} style={styles.errorBox} activeOpacity={0.8}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      )}

      {/* --- List Content --- */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>බෙදාහැරීම් තොරතුරු පූරණය වෙමින්…</Text>
        </View>
      ) : (
        <FlatList
          data={sortedDeliveries}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <DeliveryCard delivery={item} refresh={refresh} />}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => void refresh()}
              colors={['#0F766E']}
              tintColor="#0F766E"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant-closed" size={56} color="#94A3B8" />
              <Text style={styles.emptyTitle}>බෙදාහැරීම් කිසිවක් නැත</Text>
              <Text style={styles.emptySubtitle}>
                දැනට ඔබගේ district එකේ භාණ්ඩ බෙදාහැරීම් නොමැත. Dashboard එකෙන් ඔබගේ base district සකස් කර ඇති බව තහවුරු කරන්න.
              </Text>
            </View>
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
    backgroundColor: '#083D35',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#083D35',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#A7F3D0',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  statBadge: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyTitle: {
    color: '#334155',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
});
