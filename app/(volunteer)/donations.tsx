import React, { useCallback, useRef, useState, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Platform,
  RefreshControl,
  Linking,
  ScrollView,
  AppState,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

const CATEGORY_IMAGES = {
  water: require('../../assets/images/categories/water.jpg'),
  cooked_food: require('../../assets/images/categories/cooked_food.jpg'),
  food: require('../../assets/images/categories/food.jpg'),
  medical: require('../../assets/images/categories/medical.jpg'),
  clothing: require('../../assets/images/categories/clothing.jpg'),
  shelter: require('../../assets/images/categories/shelter.jpg'),
  baby: require('../../assets/images/categories/baby.jpg'),
  hygiene: require('../../assets/images/categories/hygiene.jpg'),
  general: require('../../assets/images/categories/general.jpg'),
};

export interface ItemMeta {
  categoryLabel: string;
  image: ImageSourcePropType;
  icon: string;
  color: string;
  bg: string;
}

const getItemMeta = (name: string = '', cat: string = ''): ItemMeta => {
  const text = (name + ' ' + cat).toLowerCase();
  if (
    text.includes('water') ||
    text.includes('ජලය') ||
    text.includes('drink') ||
    text.includes('bottle') ||
    text.includes('පැන්') ||
    text.includes('වතුර')
  ) {
    return {
      categoryLabel: 'පානීය ජලය (Drinking Water)',
      image: CATEGORY_IMAGES.water,
      icon: 'tint',
      color: '#0284C7',
      bg: '#E0F2FE',
    };
  }
  if (
    text.includes('cooked_food')
  ) {
    return {
      categoryLabel: 'සකස් කල ආහාර (Cooked Food)',
      image: CATEGORY_IMAGES.cooked_food,
      icon: 'utensils',
      color: '#EA580C',
      bg: '#FFEDD5',
    };
  }
  if (
    text.includes('food') ||
    text.includes('කෑම') ||
    text.includes('සහල්') ||
    text.includes('rations') ||
    text.includes('rice') ||
    text.includes('meal') ||
    text.includes('dhal') ||
    text.includes('dry') ||
    text.includes('පරිප්පු') ||
    text.includes('ආහාර')
  ) {
    return {
      categoryLabel: 'වියළි ආහාර සහ සලාක (Food & Rations)',
      image: CATEGORY_IMAGES.food,
      icon: 'utensils',
      color: '#EA580C',
      bg: '#FFEDD5',
    };
  }
  if (
    text.includes('med') ||
    text.includes('බෙහෙත්') ||
    text.includes('drug') ||
    text.includes('first aid') ||
    text.includes('panadol') ||
    text.includes('ඖෂධ') ||
    text.includes('ප්‍රථමාධාර') ||
    text.includes('bandage')
  ) {
    return {
      categoryLabel: 'ප්‍රථමාධාර සහ ඖෂධ (Medical Aid)',
      image: CATEGORY_IMAGES.medical,
      icon: 'briefcase-medical',
      color: '#DC2626',
      bg: '#FEE2E2',
    };
  }
  if (
    text.includes('cloth') ||
    text.includes('ඇඳුම්') ||
    text.includes('blanket') ||
    text.includes('bed') ||
    text.includes('sheet') ||
    text.includes('රෙදි') ||
    text.includes('ඇඳ') ||
    text.includes('පැළඳුම්')
  ) {
    return {
      categoryLabel: 'ඇඳුම් සහ ඇතිරිලි (Clothing & Bedding)',
      image: CATEGORY_IMAGES.clothing,
      icon: 'tshirt',
      color: '#7C3AED',
      bg: '#EDE9FE',
    };
  }
  if (
    text.includes('tent') ||
    text.includes('shelter') ||
    text.includes('නවාතැන්') ||
    text.includes('tarpaulin') ||
    text.includes('කූඩාරම්') ||
    text.includes('ආවරණ') ||
    text.includes('ටෙන්ට්')
  ) {
    return {
      categoryLabel: 'නවාතැන් සහ කූඩාරම් (Emergency Shelter)',
      image: CATEGORY_IMAGES.shelter,
      icon: 'campground',
      color: '#059669',
      bg: '#D1FAE5',
    };
  }
  if (
    text.includes('baby') ||
    text.includes('ළමා') ||
    text.includes('milk') ||
    text.includes('diaper') ||
    text.includes('කිරි') ||
    text.includes('ළදරු') ||
    text.includes('පැම්පර්ස්')
  ) {
    return {
      categoryLabel: 'ළදරු සහ ළමා සත්කාර (Infant & Child Care)',
      image: CATEGORY_IMAGES.baby,
      icon: 'baby',
      color: '#DB2777',
      bg: '#FCE7F3',
    };
  }
  if (
    text.includes('soap') ||
    text.includes('sanit') ||
    text.includes('hygiene') ||
    text.includes('clean') ||
    text.includes('සනීපාරක්ෂක') ||
    text.includes('සබන්') ||
    text.includes('ටූත්')
  ) {
    return {
      categoryLabel: 'සනීපාරක්ෂක ද්‍රව්‍ය (Sanitation & Hygiene)',
      image: CATEGORY_IMAGES.hygiene,
      icon: 'pump-soap',
      color: '#0D9488',
      bg: '#CCFBF1',
    };
  }
  return {
    categoryLabel: cat || 'සහනාධාර ද්‍රව්‍ය (Relief Supplies)',
    image: CATEGORY_IMAGES.general,
    icon: 'box-open',
    color: '#00897B',
    bg: '#E0F2F1',
  };
};

export interface NeedItem {
  id: string | number;
  tenant_id: string;
  name: string;
  category_name: string;
  unit: string;
  needed_quantity: number;
  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;
  target_quantity: number;
  urgency: 'CRITICAL' | 'HIGH' | string;
}

export interface TenantLocation {
  id: string;
  name: string;
  description?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status?: string;
}

export interface TenantGroup {
  tenantId: string;
  tenantName: string;
  description: string;
  latitude?: number;
  longitude?: number;
  needs: NeedItem[];
  criticalCount: number;
  highCount: number;
  totalQuantity: number;
}

export default function DonationsScreen() {
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [tenants, setTenants] = useState<TenantLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fetching = useRef(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [collapsedTenants, setCollapsedTenants] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      // The location directory excludes centers without coordinates; merge
      // the tenant directory so those centers still display their real names.
      const [needsRes, tenantsRes, locationsRes] = await Promise.all([
        api.get('/inventory/needs'),
        api.get('/auth/tenants'),
        api.get('/auth/tenants/locations'),
      ]);
      if (![needsRes.data, tenantsRes.data, locationsRes.data].every(Array.isArray)) {
        throw new Error('Invalid donation directory response');
      }
      const locations = new Map<string, TenantLocation>(locationsRes.data.map((t: TenantLocation) => [t.id, t]));
      setTenants(tenantsRes.data.map((t: TenantLocation) => ({ ...t, ...locations.get(t.id) })));
      setNeeds(needsRes.data);
      setLoadError(null);
    } catch (error) {
      console.error('Unable to refresh donation needs:', error);
      setLoadError('අවශ්‍යතා යාවත්කාලීන කළ නොහැක. නැවත උත්සාහ කරන්න.');
    } finally {
      fetching.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void fetchData();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void fetchData();
    }, 15000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void fetchData();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [fetchData]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Map tenants by ID for fast lookup
  const tenantMap = useMemo(() => {
    const map = new Map<string, TenantLocation>();
    tenants.forEach((t) => map.set(t.id, t));
    return map;
  }, [tenants]);

  // Group needs by tenant and apply search/filters
  const groupedData = useMemo(() => {
    // 1. Filter raw needs first
    const filtered = needs.filter((item) => {
      // Urgency filter
      if (selectedUrgency !== 'ALL' && item.urgency !== selectedUrgency) {
        return false;
      }

      // Tenant filter
      if (selectedTenantId !== 'ALL' && item.tenant_id !== selectedTenantId) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const tenant = tenantMap.get(item.tenant_id);
        const tenantName = tenant?.name?.toLowerCase() || '';
        const itemName = item.name?.toLowerCase() || '';
        const catName = item.category_name?.toLowerCase() || '';

        const matches =
          itemName.includes(query) ||
          catName.includes(query) ||
          tenantName.includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // 2. Group by tenant
    const groups = new Map<string, TenantGroup>();

    filtered.forEach((item) => {
      const tid = item.tenant_id || 'unknown';
      if (!groups.has(tid)) {
        const tenantInfo = tenantMap.get(tid);
        groups.set(tid, {
          tenantId: tid,
          tenantName:
            tenantInfo?.name ||
            (tid === 'unknown'
              ? 'ප්‍රධාන ආපදා සහන මධ්‍යස්ථානය'
              : `සහන මධ්‍යස්ථානය (${tid.slice(0, 8)})`),
          description:
            tenantInfo?.description || 'ආපදා සහන මෙහෙයුම් සහ බෙදාහැරීමේ මධ්‍යස්ථානය',
          latitude: tenantInfo?.latitude != null && Number.isFinite(Number(tenantInfo.latitude)) ? Number(tenantInfo.latitude) : undefined,
          longitude: tenantInfo?.longitude != null && Number.isFinite(Number(tenantInfo.longitude)) ? Number(tenantInfo.longitude) : undefined,
          needs: [],
          criticalCount: 0,
          highCount: 0,
          totalQuantity: 0,
        });
      }

      const group = groups.get(tid)!;
      group.needs.push(item);
      if (item.urgency === 'CRITICAL') {
        group.criticalCount += 1;
      } else {
        group.highCount += 1;
      }
      group.totalQuantity += Number(item.needed_quantity) || 0;
    });

    return Array.from(groups.values()).sort((a, b) => b.criticalCount - a.criticalCount || a.tenantName.localeCompare(b.tenantName));
  }, [needs, tenantMap, searchQuery, selectedUrgency, selectedTenantId]);

  // Global Statistics
  const stats = useMemo(() => {
    let totalItems = 0;
    let criticalCount = 0;
    const activeCenters = new Set<string>();

    needs.forEach((item) => {
      totalItems += 1;
      if (item.urgency === 'CRITICAL') criticalCount += 1;
      if (item.tenant_id) activeCenters.add(item.tenant_id);
    });

    return {
      totalItems,
      criticalCount,
      centersCount: activeCenters.size,
    };
  }, [needs]);

  const toggleTenantCollapse = (tenantId: string) => {
    setCollapsedTenants((prev) => ({
      ...prev,
      [tenantId]: !prev[tenantId],
    }));
  };

  const openInMaps = (lat?: number, lng?: number, label?: string) => {
    if (lat === undefined || lng === undefined) {
      Alert.alert('දැනුම්දීම', 'මෙම මධ්‍යස්ථානයේ පිහිටුම් ඛණ්ඩාංක (Coordinates) නොමැත.');
      return;
    }

    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const name = encodeURIComponent(label || 'Relief Center');
    const url =
      Platform.select({
        ios: `${scheme}${name}@${latLng}`,
        android: `${scheme}${latLng}(${name})`,
        default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
      }) || `https://www.google.com/maps/search/?api=1&query=${latLng}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
      });
  };

  const renderNeedItem = (item: NeedItem) => {
    const isCritical = item.urgency === 'CRITICAL';
    const meta = getItemMeta(item.name, item.category_name);
    const neededQty = Number(item.needed_quantity) || 0;

    return (
      <View key={item.id.toString()} style={styles.itemCard}>
        {/* Category Image Banner with Visual Overlays */}
        <View style={styles.bannerImageContainer}>
          <Image
            source={meta.image}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlayShade} />

          {/* Top Floating Badges */}
          <View style={styles.bannerOverlayTop}>
            <View style={styles.bannerCategoryTag}>
              <FontAwesome5 name={meta.icon} size={11} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.bannerCategoryText} numberOfLines={1}>
                {meta.categoryLabel}
              </Text>
            </View>

            <View
              style={[
                styles.urgencyBadge,
                isCritical ? styles.urgencyCriticalBadge : styles.urgencyHighBadge,
              ]}
            >
              <Ionicons
                name={isCritical ? 'alert-circle' : 'warning'}
                size={12}
                color={isCritical ? '#FFFFFF' : '#92400E'}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.urgencyBadgeText,
                  { color: isCritical ? '#FFFFFF' : '#92400E' },
                ]}
              >
                {isCritical ? 'CRITICAL' : 'HIGH'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Details Body */}
        <View style={styles.cardBody}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.category_name ? (
            <Text style={styles.categorySubText} numberOfLines={1}>
              වර්ගීකරණය: {item.category_name}
            </Text>
          ) : null}

          {/* Direct Required Donation Hero Section */}
          <View style={[styles.donationNeedBox, isCritical && styles.donationNeedBoxCritical]}>
            <View style={styles.donationNeedHeader}>
              <View
                style={[
                  styles.donationNeedIconBox,
                  { backgroundColor: isCritical ? '#FEE2E2' : '#CCFBF1' },
                ]}
              >
                <FontAwesome5
                  name="hand-holding-heart"
                  size={14}
                  color={isCritical ? '#DC2626' : '#0D9488'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.donationNeedTitle, isCritical && { color: '#B91C1C' }]}>
                  පරිත්‍යාග අවශ්‍ය ප්‍රමාණය
                </Text>
                <Text style={styles.donationNeedSubtitle}>
                  {isCritical
                    ? '🚨 අත්‍යවශ්‍ය හදිසි හිඟයකි (Critical)'
                    : '📦 ප්‍රමුඛතාවය සහිත අවශ්‍යතාවයකි (High)'}
                </Text>
              </View>
            </View>

            <View style={styles.donationQtyRow}>
              <Text style={[styles.donationQtyNumber, isCritical && styles.donationQtyNumberCritical]}>
                {neededQty.toLocaleString()}
              </Text>
              <Text style={styles.donationQtyUnit}>
                {item.unit || 'ඒකක'}
              </Text>
            </View>
          </View>

          {/* Target Reference Row (Clean & minimal) */}
          {Number(item.target_quantity) > 0 && (
            <View style={styles.itemTargetRow}>
              <Ionicons name="flag-outline" size={13} color="#64748B" />
              <Text style={styles.itemTargetText}>
                සම්පූර්ණ ඉලක්කය:{' '}
                <Text style={styles.itemTargetBold}>
                  {Number(item.target_quantity).toLocaleString()} {item.unit || ''}
                </Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTenantGroup = ({ item: group }: { item: TenantGroup }) => {
    const isCollapsed = !!collapsedTenants[group.tenantId];
    const hasCoordinates = group.latitude !== undefined && group.longitude !== undefined;

    return (
      <View style={styles.tenantCard}>
        {/* Tenant Header */}
        <TouchableOpacity
          style={styles.tenantHeader}
          onPress={() => toggleTenantCollapse(group.tenantId)}
          activeOpacity={0.85}
        >
          <View style={styles.tenantIconCircle}>
            <FontAwesome5 name="warehouse" size={18} color="#00897B" />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.tenantTitleRow}>
              <Text style={styles.tenantName} numberOfLines={2}>
                {group.tenantName}
              </Text>
            </View>

            <Text style={styles.tenantDescription} numberOfLines={2}>
              {group.description}
            </Text>
          </View>

          <View style={styles.collapseIconBox}>
            <MaterialIcons
              name={isCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
              size={24}
              color="#64748B"
            />
          </View>
        </TouchableOpacity>

        {/* Location & Summary Sub-bar */}
        <View style={styles.tenantLocationBar}>
          <View style={styles.locationDetails}>
            <MaterialIcons name="place" size={16} color="#00897B" />
            <Text style={styles.locationText} numberOfLines={1}>
              {hasCoordinates
                ? `Lat: ${group.latitude?.toFixed(4)}, Lng: ${group.longitude?.toFixed(4)}`
                : 'මධ්‍යස්ථානයේ පිහිටීම සඳහන් කර නැත'}
            </Text>
          </View>

          {hasCoordinates && (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => openInMaps(group.latitude, group.longitude, group.tenantName)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="directions" size={12} color="#00897B" />
              <Text style={styles.mapBtnText}>සිතියම</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Badges Strip: Shortage summary */}
        <View style={styles.statsStrip}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              භාණ්ඩ වර්ග <Text style={styles.statPillBold}>{group.needs.length}</Text> කට පරිත්‍යාග අවශ්‍යයි
            </Text>
          </View>

          {group.criticalCount > 0 && (
            <View style={[styles.statPill, styles.criticalPill]}>
              <Text style={[styles.statPillText, styles.criticalPillText]}>
                🚨 Critical {group.criticalCount}
              </Text>
            </View>
          )}

          {group.highCount > 0 && (
            <View style={[styles.statPill, styles.highPill]}>
              <Text style={[styles.statPillText, styles.highPillText]}>
                ⚠️ High Priority {group.highCount}
              </Text>
            </View>
          )}
        </View>

        {/* Needs List (Expandable) */}
        {!isCollapsed && (
          <View style={styles.needsContainer}>
            <View style={styles.needsSectionHeader}>
              <Text style={styles.needsSectionTitle}>අවශ්‍ය භාණ්ඩ හා ප්‍රමාණ:</Text>
              <Text style={styles.needsCountNotice}>
                සෘජුවම මධ්‍යස්ථානය වෙත භාරදෙන්න
              </Text>
            </View>
            {group.needs.map(renderNeedItem)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Top Header --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            

          </View>

          
        </View>


        

        {/* --- Content Area --- */}
        {loadError && (
          <TouchableOpacity style={styles.errorBanner} onPress={onRefresh} accessibilityRole="button">
            <Text style={styles.errorText}>{loadError}</Text>
          </TouchableOpacity>
        )}
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#00897B" />
            <Text style={styles.loadingText}>අවශ්‍යතා ලැයිස්තුව සකස් කරමින් පවතී...</Text>
          </View>
        ) : groupedData.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyCircle}>
              <FontAwesome5 name="box-open" size={36} color="#00897B" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedUrgency !== 'ALL' || selectedTenantId !== 'ALL'
                ? 'සෙවුමට අදාළ අවශ්‍යතා නොමැත'
                : loadError ? 'අවශ්‍යතා ලබාගත නොහැක' : 'දැනට කිසිදු හිඟයක් වාර්තා වී නොමැත'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery || selectedUrgency !== 'ALL' || selectedTenantId !== 'ALL'
                ? 'කරුණාකර පෙරහන් (Filters) ඉවත් කර නැවත බලන්න.'
                : loadError ? 'ඉහත දැනුම්දීම ඔබා නැවත උත්සාහ කරන්න.' : 'වාර්තා වූ තොග අතර ඉතිරිය 100ට අඩු භාණ්ඩ වර්ග නොමැත.'}
            </Text>
            {(searchQuery || selectedUrgency !== 'ALL' || selectedTenantId !== 'ALL') && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedUrgency('ALL');
                  setSelectedTenantId('ALL');
                }}
              >
                <Text style={styles.clearBtnText}>පෙරහන් ඉවත් කරන්න (Reset)</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={groupedData}
            keyExtractor={(item) => item.tenantId}
            renderItem={renderTenantGroup}
            contentContainerStyle={styles.listContainer}
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
  errorBanner: { marginHorizontal: 14, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10 },
  errorText: { color: '#B91C1C', fontSize: 12 },
  safeArea: {
    flex: 1,
    backgroundColor: '#041F1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* --- Top Header --- */
  header: {
    backgroundColor: '#041F1A',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#80CBC4',
    marginTop: 3,
    fontWeight: '500',
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- Metrics Strip --- */
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    color: '#B2DFDB',
    marginTop: 2,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  /* --- Notice Card --- */
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  noticeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  noticeText: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },

  /* --- Search & Filters --- */
  searchSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#00897B',
    borderColor: '#00897B',
  },
  filterChipCriticalActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipHighActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextWhite: {
    color: '#FFFFFF',
  },
  tenantScrollContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  tenantChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tenantChipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  tenantChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tenantChipTextActive: {
    color: '#FFFFFF',
  },

  /* --- List Container --- */
  listContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 30,
  },

  /* --- Tenant Card --- */
  tenantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  tenantIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  tenantDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  collapseIconBox: {
    marginLeft: 8,
  },

  /* --- Location & Directions Bar --- */
  tenantLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#475569',
    marginLeft: 4,
    fontWeight: '600',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  mapBtnText: {
    fontSize: 11,
    color: '#00897B',
    fontWeight: '800',
  },

  /* --- Stats Strip --- */
  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  statPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  statPillBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  criticalPill: {
    backgroundColor: '#FEF2F2',
  },
  criticalPillText: {
    color: '#DC2626',
    fontWeight: '800',
  },
  highPill: {
    backgroundColor: '#FFFBEB',
  },
  highPillText: {
    color: '#D97706',
    fontWeight: '800',
  },

  /* --- Needs List Inside Tenant --- */
  needsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: '#FAFBFD',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  needsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  needsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  needsCountNotice: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },

  /* --- Item Card --- */
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bannerImageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlayShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  bannerOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: '65%',
  },
  bannerCategoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  urgencyCriticalBadge: {
    backgroundColor: '#DC2626',
  },
  urgencyHighBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 14,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  categorySubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 8,
    fontWeight: '500',
  },
  donationNeedBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  donationNeedBoxCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  donationNeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  donationNeedIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationNeedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  donationNeedSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  donationQtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingLeft: 4,
  },
  donationQtyNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F766E',
  },
  donationQtyNumberCritical: {
    color: '#DC2626',
  },
  donationQtyUnit: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  itemTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemTargetText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  itemTargetBold: {
    fontWeight: '700',
    color: '#334155',
  },

  /* --- Center Loading / Empty States --- */
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#00897B',
    fontWeight: '700',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  clearBtn: {
    marginTop: 16,
    backgroundColor: '#00897B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
