import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api, clearAuthTokens } from '../../services/api';

const SRI_LANKAN_SKILLS = [
  { value: 'first_aid', label: 'First Aid', icon: 'medkit' },
  { value: 'search_&_rescue', label: 'Search & Rescue', icon: 'life-ring' },
  { value: 'debris_clearing', label: 'Debris Clearing', icon: 'hammer' },
  { value: 'food_distribution', label: 'Food Distribution', icon: 'utensils' },
  { value: 'medical_assistance', label: 'Medical Assistance', icon: 'user-md' },
  { value: 'driving_transport', label: 'Driving/Transport', icon: 'truck' },
  { value: 'boat_operating', label: 'Boat Operating', icon: 'ship' },
  { value: 'counseling', label: 'Counseling & Mental Health', icon: 'heartbeat' },
  { value: 'cooking', label: 'Community Cooking', icon: 'fire' },
  { value: 'technical', label: 'Technical / IT Support', icon: 'laptop' }
];

export default function VolunteerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile States
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [editDistrict, setEditDistrict] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      let currentProfile = null;

      try {
        const profileRes = await api.get('/volunteer/profiles/me');
        currentProfile = profileRes.data;
        setProfile(currentProfile);

        if (!currentProfile.base_district) {
          Alert.alert(
            'සාදරයෙන් පිළිගනිමු!',
            'මෙහෙයුම් ලබා ගැනීමට පෙර කරුණාකර ඔබගේ ගිණුමේ විස්තර සම්පූර්ණ කරන්න.'
          );
          setIsProfileModalVisible(true);
          return;
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          Alert.alert('Processing', 'ඔබේ ගිණුම සකසමින් පවතී. කරුණාකර ටිකකින් Refresh කරන්න.');
          return;
        } else {
          throw err;
        }
      }

      if (currentProfile && currentProfile.base_district) {
        const assignmentsRes = await api.get('/volunteer/assignments');
        setAssignments(assignmentsRes.data);
      }
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
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const toggleSkill = (skill: string) => {
    if (editSkills.includes(skill)) {
      setEditSkills(editSkills.filter(s => s !== skill));
    } else {
      setEditSkills([...editSkills, skill]);
    }
  };

  const toggleAvailability = async (value: boolean) => {
    try {
      await api.patch('/volunteer/profiles/me/availability', { available_status: value });
      setProfile({ ...profile, available_status: value });
    } catch (error: any) {
      if (error.response?.status === 422) {
        Alert.alert('අවධානයයි!', 'Active වීමට පෙර ඔබගේ ප්‍රදේශය (Base District) තෝරා Save කරන්න.');
      } else {
        console.error(error);
      }
    }
  };

  const handleAccept = async (assignmentId: string) => {
    try {
      await api.post(`/volunteer/assignments/${assignmentId}/accept`, {});
      Alert.alert('Success', 'ඔබ මෙම assignment එක accept කර ඇත! 🚀');
      fetchDashboardData();
    } catch (error: any) {
      if (error.response?.status === 409) {
        Alert.alert(
          'Too Late',
          'කණගාටුයි, මෙම කාර්යය දැනටමත් වෙනත් ස්වේච්ඡා සේවකයෙකු විසින් භාරගෙන ඇත.'
        );
      } else {
        Alert.alert('Error', 'Assignment accept කිරීමේදී ගැටලුවක් ඇතිවිය.');
      }
    }
  };

  const handleDecline = async (assignmentId: string) => {
    try {
      await api.post(`/volunteer/assignments/${assignmentId}/decline`, {});
      Alert.alert('Declined', 'ඔබ assignment එක ප්‍රතික්ෂේප කළා.');
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Assignment decline කිරීමේදී ගැටලුවක් ඇතිවිය.');
    }
  };

  const handleEnRoute = async (assignmentId: string) => {
    try {
      await api.post(`/volunteer/assignments/${assignmentId}/en-route`, {});
      Alert.alert('On the way!', 'ඔබ ස්ථානයට ගමන් කරන බව යාවත්කාලීන විය. පරිස්සමින් යන්න! 🚶‍♂️');
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Status යාවත්කාලීන කිරීම අසාර්ථකයි.');
    }
  };

  const handleComplete = async (assignmentId: string) => {
    try {
      await api.post(`/volunteer/assignments/${assignmentId}/complete`, {});
      Alert.alert('Mission Accomplished!', 'නියමයි! ඔබ සාර්ථකව මෙහෙයුම අවසන් කළා. ස්තූතියි! 🏆');
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Status යාවත්කාලීන කිරීම අසාර්ථකයි.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('ඉවත් වන්න', 'ඔබට ගිණුමෙන් ඉවත් වීමට අවශ්‍යද?', [
      { text: 'නැත', style: 'cancel' },
      {
        text: 'ඔව්',
        style: 'destructive',
        onPress: async () => {
          await clearAuthTokens();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const VALID_SKILL_VALUES = SRI_LANKAN_SKILLS.map(s => s.value);

  const saveProfile = async () => {
    if (!editDistrict || !editCity || editSkills.length === 0) {
      Alert.alert('අඩුපාඩුයි', 'කරුණාකර දිස්ත්‍රික්කය, නගරය සහ අඩුම තරමේ එක් හැකියාවක්වත් තෝරන්න.');
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/volunteer/profiles/me', {
        base_district: editDistrict,
        city: editCity,
        available_status: profile?.available_status || false,
        skills: editSkills,
      });
      Alert.alert('Success', 'Profile එක සාර්ථකව Update විය!');
      setIsProfileModalVisible(false);
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Profile update කිරීම අසාර්ථකයි.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = () => {
    setEditDistrict(profile?.base_district || '');
    setEditCity(profile?.city || '');
    setEditSkills((profile?.skills || []).filter((s: string) => VALID_SKILL_VALUES.includes(s)));
    setIsProfileModalVisible(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOTIFIED':
        return {
          color: '#D97706',
          bgColor: '#FEF3C7',
          borderColor: '#FDE68A',
          icon: 'bell-ring-outline',
          label: 'නව ඉල්ලීමක් (Notified)',
        };
      case 'ACCEPTED':
        return {
          color: '#0284C7',
          bgColor: '#E0F2FE',
          borderColor: '#BAE6FD',
          icon: 'account-check-outline',
          label: 'භාරගෙන ඇත (Accepted)',
        };
      case 'EN_ROUTE':
        return {
          color: '#EA580C',
          bgColor: '#FFEDD5',
          borderColor: '#FED7AA',
          icon: 'truck-fast-outline',
          label: 'ගමන් කරමින් (En Route)',
        };
      case 'COMPLETED':
        return {
          color: '#059669',
          bgColor: '#D1FAE5',
          borderColor: '#A7F3D0',
          icon: 'checkbox-marked-circle-outline',
          label: 'අවසන් කළා (Completed)',
        };
      default:
        return {
          color: '#64748B',
          bgColor: '#F1F5F9',
          borderColor: '#E2E8F0',
          icon: 'help-circle-outline',
          label: status,
        };
    }
  };

  const renderAssignmentItem = ({ item }: { item: any }) => {
    const badge = getStatusBadge(item.status);

    return (
      <View style={styles.assignmentCard}>
        {/* Top row with status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.missionIdPill}>
            <MaterialIcons name="fingerprint" size={14} color="#00897B" />
            <Text style={styles.missionIdText}>ID: {item.event_id || item.id?.slice(0, 8)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bgColor, borderColor: badge.borderColor }]}>
            <MaterialCommunityIcons name={badge.icon as any} size={14} color={badge.color} />
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Status Actions */}
        {item.status === 'NOTIFIED' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleDecline(item.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={18} color="#EF4444" />
              <Text style={styles.declineBtnText}>ප්‍රතික්ෂේප (Decline)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAccept(item.id)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="check" size={14} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>භාරගන්න (Accept)</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'ACCEPTED' && (
          <TouchableOpacity
            style={styles.enRouteBtn}
            onPress={() => handleEnRoute(item.id)}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="walking" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Mark En Route (යන ගමන්)</Text>
          </TouchableOpacity>
        )}

        {item.status === 'EN_ROUTE' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => handleComplete(item.id)}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Mark Complete (අවසන් කළා)</Text>
          </TouchableOpacity>
        )}

        {item.status === 'COMPLETED' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>🏆 මෙහෙයුම සාර්ථකව අවසන් කර ඇත!</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00897B" />
          <Text style={styles.loadingText}>තොරතුරු ලබාගනිමින් පවතී...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAvailable = profile?.available_status || false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Header Section (Dark Teal/Slate themed) --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextGroup}>
              <View style={styles.roleTag}>
                <FontAwesome5 name="shield-alt" size={11} color="#00897B" />
                <Text style={styles.roleTagText}>VOLUNTEER HERO</Text>
              </View>
              <Text style={styles.greetingTitle} numberOfLines={1}>
                ආයුබෝවන්, {profile?.full_name?.split(' ')[0] || 'Volunteer'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.profileIconBtn}
                onPress={openEditModal}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="user-cog" size={17} color="#00897B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutIconBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="logout" size={19} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          data={assignments}
          keyExtractor={item => item.id}
          renderItem={renderAssignmentItem}
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
          ListHeaderComponent={
            <>
              {/* --- Availability Status Card --- */}
              <View style={[styles.statusHeroCard, isAvailable ? styles.cardActive : styles.cardInactive]}>
                <View style={styles.statusHeroContent}>
                  <View style={styles.statusIconCircle}>
                    <FontAwesome5
                      name={isAvailable ? 'broadcast-tower' : 'power-off'}
                      size={20}
                      color={isAvailable ? '#059669' : '#64748B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusHeroTitle, { color: isAvailable ? '#065F46' : '#334155' }]}>
                      {isAvailable ? '🟢 සක්‍රීයයි (Active & Ready)' : '⚪ අක්‍රීයයි (Offline)'}
                    </Text>
                    <Text style={styles.statusHeroSub}>
                      {isAvailable
                        ? 'ඔබ ආසන්නයේ සිදුවන ආපදා මෙහෙයුම් ඔබට ලැබෙනු ඇත.'
                        : 'නව මෙහෙයුම් ලබා ගැනීමට Switch එක On කරන්න.'}
                    </Text>
                  </View>
                  <Switch
                    value={isAvailable}
                    onValueChange={toggleAvailability}
                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                    thumbColor={isAvailable ? '#00897B' : '#94A3B8'}
                  />
                </View>
              </View>

              {/* --- Volunteer Info Chips Strip --- */}
              <View style={styles.infoStrip}>
                <TouchableOpacity style={styles.infoPill} onPress={openEditModal} activeOpacity={0.8}>
                  <MaterialIcons name="place" size={16} color="#00897B" />
                  <Text style={styles.infoPillText}>
                    {profile?.base_district ? `${profile.base_district}` : 'District Not Set'}
                    {profile?.city ? `, ${profile.city}` : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.infoPill} onPress={openEditModal} activeOpacity={0.8}>
                  <FontAwesome5 name="tools" size={13} color="#00897B" />
                  <Text style={styles.infoPillText}>
                    {profile?.skills?.length ? `${profile.skills.length} Skills` : 'No Skills Set'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* --- Section Title --- */}
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.sectionTitle}>ඔබගේ මෙහෙයුම් (Assignments)</Text>
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{assignments.length}</Text>
                  </View>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FontAwesome5 name="clipboard-check" size={36} color="#00897B" />
              </View>
              <Text style={styles.emptyTitle}>දැනට නව මෙහෙයුම් නොමැත</Text>
              <Text style={styles.emptySub}>
                ඔබගේ ප්‍රදේශයේ නව ආපදාවක් වාර්තා වූ වහාම මෙහි දිස්වනු ඇත.
              </Text>
            </View>
          }
        />

        {/* --- Profile Edit Modal --- */}
        <Modal visible={isProfileModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderIcon}>
                  <FontAwesome5 name="user-edit" size={18} color="#00897B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>ස්වේච්ඡා ගිණුම (Profile)</Text>
                  <Text style={styles.modalSubtitle}>ඔබගේ සේවා ප්‍රදේශය සහ හැකියාවන් යාවත්කාලීන කරන්න</Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>මූලික දිස්ත්‍රික්කය (Base District) *</Text>
                <View style={styles.modalInputWrapper}>
                  <MaterialIcons name="location-city" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    value={editDistrict}
                    onChangeText={setEditDistrict}
                    placeholder="උදා: Colombo, Galle, Kandy"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <Text style={styles.inputLabel}>ආසන්න නගරය (City) *</Text>
                <View style={styles.modalInputWrapper}>
                  <MaterialIcons name="map" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="උදා: Moratuwa, Ambalangoda"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <Text style={styles.inputLabel}>ඔබේ හැකියාවන් (Skills තෝරන්න) *</Text>
                <View style={styles.skillsContainer}>
                  {SRI_LANKAN_SKILLS.map(skill => {
                    const isSelected = editSkills.includes(skill.value);
                    return (
                      <TouchableOpacity
                        key={skill.value}
                        style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                        onPress={() => toggleSkill(skill.value)}
                        activeOpacity={0.7}
                      >
                        <FontAwesome5
                          name={skill.icon as any}
                          size={12}
                          color={isSelected ? '#FFFFFF' : '#00897B'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>
                          {skill.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                onPress={saveProfile}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>තොරතුරු සුරකින්න (Save Details)</Text>
                )}
              </TouchableOpacity>

              {profile?.base_district && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsProfileModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>වසන්න (Close)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#041F1A', // Dark emerald/teal tone for status bar
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
  headerTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 137, 123, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    gap: 4,
  },
  roleTagText: {
    color: '#80CBC4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B2DFDB',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- List Content & Sections --- */
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  /* --- Availability Card --- */
  statusHeroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cardInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  statusHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statusHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusHeroSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },

  /* --- Info Chips Strip --- */
  infoStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  infoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },

  /* --- Section Header --- */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  badgeCount: {
    backgroundColor: '#00897B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* --- Assignment Cards --- */
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  missionIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00695C',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  /* --- Action Buttons inside cards --- */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  declineBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00897B',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#00897B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  enRouteBtn: {
    backgroundColor: '#00897B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
  },
  completeBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  completedBanner: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    color: '#047857',
    fontWeight: '800',
    fontSize: 13,
  },

  /* --- Empty State --- */
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* --- Profile Modal --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  skillChipSelected: {
    backgroundColor: '#00897B',
    borderColor: '#00796B',
  },
  skillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00695C',
  },
  skillTextSelected: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#00897B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
});