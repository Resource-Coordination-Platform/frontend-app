import { formatRequestedItems } from '../../services/help-requests';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, clearAuthTokens } from '../../services/api';
import { useDeliveries } from '../../services/deliveries';
import { DeliveryCard } from '../../components/delivery-card';

const formatLastUpdated = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'දැන් සුළු මොහොතකට පෙර';
  if (diffMinutes < 60) return `මිනිත්තු ${diffMinutes}කට පෙර`;
  if (diffHours < 24) return `පැය ${diffHours}කට පෙර`;
  if (diffDays === 1) return 'ඊයේ';
  return date.toLocaleDateString();
};

export default function VictimHomeScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');
  const router = useRouter();
  const deliveries = useDeliveries();

  const handleLogout = async () => {
    Alert.alert(
      "ඉවත් වන්න",
      "ඔබට ගිණුමෙන් ඉවත් වීමට අවශ්‍යද?",
      [
        { text: "නැත", style: "cancel" },
        { 
          text: "ඔව්", 
          style: "destructive",
          onPress: async () => {
            await clearAuthTokens();
            router.replace('/welcome');
          }
        }
      ]
    );
  };

  const fetchMyRequests = useCallback(async () => {
    try {
      const res = await api.get('/requests/help/my-requests');
      setRequests(res.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'ඔබගේ සැසිය අවසන් වී ඇත. කරුණාකර නැවත Login වන්න.');
        await clearAuthTokens();
        router.replace('/welcome');
      } else {
        console.error(error);
        Alert.alert('Error', 'දත්ත ලබාගැනීමේදී දෝෂයක් ඇතිවිය.');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => {
    void fetchMyRequests();
  }, [fetchMyRequests]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRequests();
    void deliveries.refresh();
  };

  // Helper to determine if a request or its delivery is completed
  const isCompletedItem = useCallback((item: any) => {
    const delivery = deliveries.data.find(d => d.victim_request_id === item.id);
    const isDeliveryCompleted = delivery && (delivery.status === 'COMPLETED' || !!delivery.completed_at);
    const isRequestCompleted = item.status === 'COMPLETED' || item.status === 'FULFILLED';
    return !!(isDeliveryCompleted || isRequestCompleted);
  }, [deliveries.data]);

  // Helper to get the most recent update timestamp (request or delivery)
  const getItemUpdateTime = useCallback((item: any) => {
    const delivery = deliveries.data.find(d => d.victim_request_id === item.id);
    const deliveryTime = delivery ? new Date(delivery.updated_at || delivery.created_at || 0).getTime() : 0;
    const requestTime = new Date(item.updated_at || item.created_at || 0).getTime();
    return Math.max(requestTime, deliveryTime);
  }, [deliveries.data]);

  // Active requests (not completed), sorted so most recently updated are at the top
  const activeRequests = useMemo(() => {
    return requests
      .filter(item => !isCompletedItem(item))
      .sort((a, b) => getItemUpdateTime(b) - getItemUpdateTime(a));
  }, [requests, isCompletedItem, getItemUpdateTime]);

  // Completed requests for History, sorted so most recently updated are at the top
  const completedRequests = useMemo(() => {
    return requests
      .filter(item => isCompletedItem(item))
      .sort((a, b) => getItemUpdateTime(b) - getItemUpdateTime(a));
  }, [requests, isCompletedItem, getItemUpdateTime]);

  const displayedRequests = selectedTab === 'active' ? activeRequests : completedRequests;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#D97706', icon: 'clock-outline', text: 'ඉල්ලීම යොමු කර ඇත', bgColor: '#FEF3C7' };
      case 'APPROVED':
      case 'VERIFIED':
        return { color: '#2563EB', icon: 'account-hard-hat', text: 'සහන කණ්ඩායම් දැනුවත් කර ඇත', bgColor: '#EFF6FF' };
      case 'IN_PROGRESS':
        return { color: '#0D9488', icon: 'progress-clock', text: 'ඔබගේ ඉල්ලීම සඳහා කටයුතු සිදු වෙමින් පවතී', bgColor: '#CCFBF1' };
      case 'ASSIGNED':
        return { color: '#16A34A', icon: 'truck-fast', text: 'උදව් ඔබ වෙත පැමිණෙමින් තිබේ', bgColor: '#DCFCE7' };
      case 'COMPLETED':
      case 'FULFILLED':
        return { color: '#15803D', icon: 'check-circle', text: 'ආධාර ලබාදී අවසන් කර ඇත', bgColor: '#DCFCE7' };
      case 'REJECTED':
        return { color: '#DC2626', icon: 'close-circle', text: 'ඉල්ලීම අනුමත කර නැත', bgColor: '#FEE2E2' };
      case 'CANCELLED':
        return { color: '#64748B', icon: 'cancel', text: 'ඉල්ලීම අවලංගු කර ඇත', bgColor: '#F1F5F9' };
      default:
        return { color: '#64748B', icon: 'help-circle', text: status, bgColor: '#F1F5F9' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isCompleted = isCompletedItem(item);
    const statusData = getStatusBadge(item.status);
    const delivery = deliveries.data.find(d => d.victim_request_id === item.id);
    const lastUpdatedText = formatLastUpdated(delivery?.updated_at || item.updated_at);
    


    
    return (
      <View style={[styles.card, isCompleted && styles.completedCardBorder]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={[
                styles.iconContainer,
                isCompleted && { backgroundColor: '#DCFCE7' },
              ]}
            >
              <FontAwesome5
                name={isCompleted ? 'check-circle' : 'hands-helping'}
                size={15}
                color={isCompleted ? '#16A34A' : '#E53935'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.disasterText}>
                {item.disaster_type ? `${item.disaster_type} ආපදාව` : 'ආධාර ඉල්ලීම'}
              </Text>
              {lastUpdatedText ? (
                <Text style={[styles.lastUpdatedText, isCompleted && { color: '#15803D' }]}>
                  යාවත්කාලීන විය: {lastUpdatedText}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.needsTitle}>ඔබ ඉල්ලූ අවශ්‍යතාවයන්:</Text>
        <Text style={styles.needsText}>
          {formatRequestedItems(item.requested_items, item.needs)}
        </Text>

        {delivery ? (
          <View style={styles.deliveryContainer}>
            <View style={styles.deliverySectionBanner}>
              <MaterialCommunityIcons name="truck-fast" size={16} color="#0F766E" />
              <Text style={styles.deliverySectionTitle}>සහන බෙදාහැරීමේ තොරතුරු & සහන සේවක</Text>
            </View>
            <DeliveryCard delivery={delivery} victim refresh={deliveries.refresh} />
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: statusData.bgColor }]}>
            <MaterialCommunityIcons name={statusData.icon as any} size={20} color={statusData.color} />
            <Text style={[styles.statusText, { color: statusData.color }]}>
              {statusData.text}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        {/* --- Top Bar: 2 Tabs + Logout on 1 Single Line --- */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'active' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('active')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={15}
              color={selectedTab === 'active' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[styles.tabButtonText, selectedTab === 'active' && styles.tabButtonTextActive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              වත්මන් ඉල්ලීම් ({activeRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'history' && styles.tabButtonHistoryActive]}
            onPress={() => setSelectedTab('history')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="history"
              size={16}
              color={selectedTab === 'history' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                selectedTab === 'history' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              ඉතිහාසය ({completedRequests.length})
            </Text>
          </TouchableOpacity>

          {/* Far Right Logout Button */}
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityLabel="Logout"
          >
            <MaterialCommunityIcons name="logout" size={19} color="#EF4444" />
          </TouchableOpacity>
        </View>


        {/* --- Content --- */}
        {deliveries.error && (
          <TouchableOpacity onPress={() => void deliveries.refresh()} style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{deliveries.error}</Text>
          </TouchableOpacity>
        )}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#E53935" />
            <Text style={styles.loadingText}>දත්ත ලබාගනිමින් පවතී…</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#94A3B8" />
            <Text style={styles.emptyTitle}>ඔබ තවමත් කිසිදු ආධාරයක් ඉල්ලා නැත.</Text>
            <Text style={styles.emptySubtitle}>
              නව ආධාර ඉල්ලීමක් යොමු කිරීමට පහත ඇති බොත්තම භාවිත කරන්න.
            </Text>
          </View>
        ) : displayedRequests.length === 0 ? (
          selectedTab === 'active' ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={56} color="#0D9488" />
              <Text style={styles.emptyTitle}>ක්‍රියාකාරී ඉල්ලීම් කිසිවක් නැත</Text>
              <Text style={styles.emptySubtitle}>
                {completedRequests.length > 0
                  ? 'ඔබගේ සියලු ඉල්ලීම් සාර්ථකව සම්පූර්ණ කර ඇත. කලින් ලැබුණු ආධාර පරීක්ෂා කිරීමට "ඉතිහාසය (History)" බොත්තම ඔබන්න.'
                  : 'නව ආධාර ඉල්ලීමක් යොමු කිරීමට පහත ඇති බොත්තම භාවිත කරන්න.'}
              </Text>
              {completedRequests.length > 0 && (
                <TouchableOpacity
                  style={styles.viewHistoryBtn}
                  onPress={() => setSelectedTab('history')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="history" size={16} color="#FFFFFF" />
                  <Text style={styles.viewHistoryBtnText}>ඉතිහාසය බලන්න ({completedRequests.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={56} color="#94A3B8" />
              <Text style={styles.emptyTitle}>සම්පූර්ණ වූ ඉල්ලීම් කිසිවක් නැත</Text>
              <Text style={styles.emptySubtitle}>
                ඔබට ආධාර බෙදාහැරීම් සාර්ථකව ලැබුණු පසු එම ඉල්ලීම් මෙහි ඉතිහාසය ලෙස සටහන් වේ.
              </Text>
            </View>
          )
        ) : (
          <FlatList
            data={displayedRequests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingTop: 6 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53935']} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    flexShrink: 0,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconContainer: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 10,
    marginRight: 10,
  },
  disasterText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  dateText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  needsTitle: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  needsText: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 4, marginBottom: 14, lineHeight: 22 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  statusText: { fontSize: 14, fontWeight: '700' },

  deliveryContainer: {
    marginTop: 4,
  },
  deliverySectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 4,
  },
  deliverySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },

  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { marginTop: 15, fontSize: 17, color: '#334155', fontWeight: '700' },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 6,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  completedCardBorder: {
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
  },
  lastUpdatedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  tabButtonActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  tabButtonHistoryActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    flexShrink: 1,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  historyInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 10,
    gap: 8,
  },
  historyInfoBannerText: {
    flex: 1,
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#15803D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  viewHistoryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
