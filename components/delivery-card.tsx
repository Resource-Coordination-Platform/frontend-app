import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Delivery } from '../services/deliveries';
import { DirectionsButton } from './directions-button';

export const getDeliveryStatusBadge = (status: string) => {
  switch (status) {
    case 'OPEN':
      return { label: 'Volunteer කෙනෙකු බලාපොරොත්තුවෙන්', color: '#D97706', bgColor: '#FEF3C7', icon: 'account-search' };
    case 'ACCEPTED':
      return { label: 'Volunteer භාරගෙන ඇත', color: '#2563EB', bgColor: '#EFF6FF', icon: 'account-check' };
    case 'COLLECTED':
      return { label: 'මධ්‍යස්ථානයෙන් භාණ්ඩ ලබාගත්තා', color: '#0D9488', bgColor: '#CCFBF1', icon: 'package-variant-closed' };
    case 'EN_ROUTE':
      return { label: 'භාණ්ඩ රැගෙන පැමිණෙමින්', color: '#7C3AED', bgColor: '#F5F3FF', icon: 'truck-fast' };
    case 'CODE_VERIFIED':
      return { label: 'Delivery Code තහවුරු කළා', color: '#059669', bgColor: '#D1FAE5', icon: 'shield-check' };
    case 'COMPLETED':
      return { label: 'බෙදාහැරීම සම්පූර්ණයි', color: '#16A34A', bgColor: '#DCFCE7', icon: 'check-circle' };
    case 'RESERVED':
    default:
      return { label: 'ආධාර වෙන් කර ඇත', color: '#4B5563', bgColor: '#F3F4F6', icon: 'clock-outline' };
  }
};

export function DeliveryCard({
  delivery: d,
  victim = false,
  refresh,
}: {
  delivery: Delivery;
  victim?: boolean;
  refresh: () => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = d.status === 'COMPLETED' || !!d.completed_at;
  const [isCollapsed, setIsCollapsed] = useState(isCompleted);

  const statusBadge = getDeliveryStatusBadge(d.status);

  const act = async (action: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/volunteers/deliveries/${d.id}/${action}`, action === 'verify-code' ? { code } : {});
      setCode('');
      await refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'යාවත්කාලීන කිරීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirm = (action: string) =>
    Alert.alert(
      victim ? 'භාණ්ඩ ලැබුණාද?' : 'භාණ්ඩ භාරදුන්නාද?',
      victim
        ? 'ලැයිස්තුවේ භාණ්ඩ ඔබට ලැබුණු පසු පමණක් තහවුරු කරන්න.'
        : 'භාණ්ඩ victimට භාරදුන් පසු පමණක් තහවුරු කරන්න.',
      [
        { text: 'නැත', style: 'cancel' },
        { text: 'ඔව්, තහවුරු කරන්න', onPress: () => void act(action) },
      ]
    );

  const button = (label: string, action: string, disabled = false, bg = '#0F766E') => (
    <TouchableOpacity
      disabled={busy || disabled}
      style={[styles.actionBtn, { backgroundColor: bg }, (busy || disabled) && { opacity: 0.5 }]}
      onPress={() => (action.startsWith('confirm-') ? confirm(action) : void act(action))}
      activeOpacity={0.8}
    >
      <Text style={styles.actionBtnText}>{busy ? 'යාවත්කාලීන වෙමින්…' : label}</Text>
    </TouchableOpacity>
  );

  if (isCompleted && isCollapsed) {
    return (
      <TouchableOpacity
        style={styles.collapsedCard}
        onPress={() => setIsCollapsed(false)}
        activeOpacity={0.8}
      >
        <View style={styles.collapsedCardLeft}>
          <View style={styles.collapsedIconCircle}>
            <MaterialCommunityIcons name="check-circle" size={22} color="#16A34A" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.collapsedHeaderRow}>
              <Text style={styles.collapsedTitle} numberOfLines={1}>
                {d.pickup_name || 'සහන මධ්‍යස්ථානය'}
              </Text>
              <View style={styles.completedMiniBadge}>
                <Text style={styles.completedMiniBadgeText}>සම්පූර්ණයි ✓</Text>
              </View>
            </View>
            <Text style={styles.collapsedSub} numberOfLines={1}>
              {d.district} · Request #{d.victim_request_id.slice(0, 8)} · {d.lines?.length || 0} භාණ්ඩ වර්ග
            </Text>
            <Text style={styles.collapsedTapPrompt}>
             (Tap to view details)
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={24} color="#64748B" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Collapse Toggle for Completed Delivery */}
      {isCompleted && (
        <TouchableOpacity
          style={styles.collapseToggleBar}
          onPress={() => setIsCollapsed(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chevron-up" size={18} color="#059669" />
          <Text style={styles.collapseToggleText}> (Tap to collapse)</Text>
        </TouchableOpacity>
      )}

      {/* 1. Header with District & Status Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.districtBadge}>
          <MaterialCommunityIcons name="map-marker" size={13} color="#0F766E" />
          <Text style={styles.districtText}>{d.district}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
          <MaterialCommunityIcons name={statusBadge.icon as any} size={14} color={statusBadge.color} />
          <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
        </View>
      </View>

      {/* 2. Relief Centre Name */}
      <View style={styles.pickupSection}>
        <Text style={styles.pickupLabel}>සහන මධ්‍යස්ථානය (Relief Centre)</Text>
        <Text style={styles.pickupName}>{d.pickup_name}</Text>
        <Text style={styles.requestIdText}>Request #{d.victim_request_id.slice(0, 8)}</Text>
      </View>

      {/* 3. Allocated Goods Items Box */}
      <View style={styles.itemsBox}>
        <Text style={styles.itemsBoxTitle}>ලබාදෙන භාණ්ඩ ලැයිස්තුව (Allocated Items):</Text>
        {d.lines.map(line => (
          <View key={line.id} style={styles.itemRow}>
            <View style={styles.itemBullet} />
            <Text style={styles.itemName}>{line.name}</Text>
            <View style={styles.itemQuantityBadge}>
              <Text style={styles.itemQuantityText}>
                {line.quantity} {line.unit}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* 4. CONTACT DETAILS: Volunteer details for Victim, Victim details for Volunteer */}
      {victim ? (
        // VICTIM VIEW: Shows Volunteer Contact
        d.volunteer_name || d.volunteer_phone ? (
          <View style={styles.contactCardVolunteer}>
            <View style={styles.contactHeaderRow}>
              <View style={styles.volunteerIconCircle}>
                <MaterialCommunityIcons name="account-hard-hat" size={22} color="#0D9488" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.contactRoleLabelVolunteer}>භාණ්ඩ රැගෙන එන සහන සේවක (Volunteer)</Text>
                <Text style={styles.contactNameText}>{d.volunteer_name || 'ස්වේච්ඡා සහන සේවක'}</Text>
              </View>
            </View>

            {d.volunteer_phone ? (
              <TouchableOpacity
                style={styles.callButtonVolunteer}
                onPress={() => Linking.openURL(`tel:${d.volunteer_phone}`)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.callButtonText}>අමතන්න: {d.volunteer_phone}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPhoneText}>දුරකථන අංකය සඳහන්ව නැත</Text>
            )}
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#D97706" />
            <Text style={styles.noticeText}>
              ස්වේච්ඡා සහන සේවකයෙකු තවම භාරගෙන නොමැත. මධ්‍යස්ථානයෙන් භාණ්ඩ සූදානම් කෙරෙමින් පවතී.
            </Text>
          </View>
        )
      ) : (
        // VOLUNTEER VIEW: Shows Victim Contact
        d.status !== 'OPEN' ? (
          <View style={styles.contactCardVictim}>
            <View style={styles.contactHeaderRow}>
              <View style={styles.victimIconCircle}>
                <MaterialCommunityIcons name="account-heart" size={22} color="#E11D48" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.contactRoleLabelVictim}>විපතට පත්වූ පුද්ගලයා (Victim Details)</Text>
                <Text style={styles.contactNameText}>{d.victim_name || 'ආධාර ඉල්ලුම්කරු'}</Text>
              </View>
            </View>

            {d.victim_phone ? (
              <TouchableOpacity
                style={styles.callButtonVictim}
                onPress={() => Linking.openURL(`tel:${d.victim_phone}`)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.callButtonText}>අමතන්න: {d.victim_phone}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPhoneText}>දුරකථන අංකය සඳහන්ව නැත</Text>
            )}
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#64748B" />
            <Text style={styles.noticeText}>
              Victimගේ පුද්ගලික තොරතුරු සහ දුරකථන අංකය මෙම බෙදාහැරීම භාරගත් (Accept කළ) පසු දිස්වේ.
            </Text>
          </View>
        )
      )}

      {/* 5. Volunteer Action: Accept */}
      {!victim && (
        <DirectionsButton latitude={d.pickup_latitude} longitude={d.pickup_longitude}
          title="1. Tenant centre — භාණ්ඩ ලබාගන්න"
          destination={`භාණ්ඩ ලබාගන්න: ${d.pickup_name}`} />
      )}
      {!victim && (
        <DirectionsButton latitude={d.destination_latitude} longitude={d.destination_longitude}
          title="2. Victim place — භාණ්ඩ භාරදෙන්න"
          destination="භාණ්ඩ භාරදෙන ස්ථානයට මාර්ගය බලන්න" />
      )}
      {!victim && d.status === 'OPEN' && (
        <View style={styles.actionSection}>
          <Text style={styles.helperText}>
            මෙම district එකේ සියලු volunteersට මෙම බෙදාහැරීම පෙන්වයි. මුලින් accept කරන එක් අයෙකුට පමණක් භාරවේ.
          </Text>
          {button('බෙදාහැරීම භාරගන්න (Accept Delivery)', 'accept', false, '#0F766E')}
        </View>
      )}

      {/* 6. Volunteer Action: Handover Wait */}
      {!victim && d.status === 'ACCEPTED' && (
        <View style={styles.noticeBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#0D9488" />
          <Text style={styles.noticeText}>
            භාණ්ඩ ලබාගැනීමට ඉහත සහන මධ්‍යස්ථානයට පැමිණෙන්න. Admin භාරදීම තහවුරු කළ පසු මෙහි update වේ.
          </Text>
        </View>
      )}

      {!victim && d.handed_over_at && d.status !== 'COMPLETED' && d.destination_latitude != null && d.destination_longitude != null && (
        <View style={styles.enRouteBox}>
          <Text style={styles.helperText}>
            භාණ්ඩ ඔබට භාරදී ඇත. Victim හමු වී ඔවුන්ගේ request එකේ code එක අසා තහවුරු කරන්න.
          </Text>
          {d.description && <Text style={styles.descriptionText}>සටහන: {d.description}</Text>}
        </View>
      )}

      {/* 8. Volunteer Action: Start Journey */}
      {!victim && d.status === 'COLLECTED' && button('ගමන ආරම්භ කරන්න (Start Delivery)', 'en-route', false, '#7C3AED')}

      {/* 9. Victim: Secret Delivery Code */}
      {victim && d.delivery_code && (
        <View style={styles.codeContainer}>
          <View style={styles.codeHeader}>
            <MaterialCommunityIcons name="lock-check" size={18} color="#92400E" />
            <Text style={styles.codeLabel}>ඔබගේ භාණ්ඩ භාරගැනීමේ රහස්‍ය අංකය (Code)</Text>
          </View>
          <Text selectable style={styles.codeValue}>
            {d.delivery_code}
          </Text>
          <Text style={styles.codeHelper}>
            භාණ්ඩ රැගෙන volunteer පැමිණි විට පමණක් මෙම අංක 6 ඔහුට ලබාදෙන්න.
          </Text>
        </View>
      )}

      {/* 10. Volunteer: Input Code */}
      {!victim && d.handed_over_at && !d.code_verified_at && (
        <View style={styles.verifyCodeSection}>
          <Text style={styles.inputLabel}>Victim ලබාදෙන අංක 6 රහස්‍ය Code එක:</Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Delivery code"
          />
          {button('Code එක තහවුරු කරන්න (Verify Code)', 'verify-code', code.length !== 6, '#059669')}
        </View>
      )}

      {/* 11. Code Verified & Confirmations */}
      {d.code_verified_at && (
        <View style={styles.confirmationBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#059669" />
            <Text style={styles.verifiedHeader}>Code එක සාර්ථකව තහවුරු කර ඇත!</Text>
          </View>
          <Text style={styles.confirmStatusText}>
            Volunteer: {d.volunteer_confirmed_at ? 'තහවුරු කළා ✓' : 'තවම තහවුරු කර නැත'}
            {'\n'}
            Victim: {d.victim_confirmed_at ? 'ලැබුණු බව තහවුරු කළා ✓' : 'තවම තහවුරු කර නැත'}
          </Text>
          {victim && !d.victim_confirmed_at && button('භාණ්ඩ ලැබුණා — තහවුරු කරන්න', 'confirm-received', false, '#16A34A')}
          {!victim && !d.volunteer_confirmed_at && button('භාණ්ඩ භාරදුන්නා — තහවුරු කරන්න', 'confirm-delivered', false, '#16A34A')}
        </View>
      )}

      {/* 12. Completed Banner */}
      {d.completed_at && (
        <View style={styles.completedBadge}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#16A34A" />
          <Text style={styles.completedText}>දෙදෙනාම තහවුරු කළා · බෙදාහැරීම සාර්ථකව සම්පූර්ණයි</Text>
        </View>
      )}

      {/* Error alert */}
      {error && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Footer Timestamp */}
      <Text style={styles.timestampText}>
        අවසන් යාවත්කාලීන කිරීම: {new Date(d.updated_at).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  districtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  districtText: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  pickupSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  pickupLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickupName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  requestIdText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  itemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  itemsBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F766E',
    marginRight: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  itemQuantityBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemQuantityText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Contact Cards (Volunteer & Victim)
  contactCardVolunteer: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  contactCardVictim: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volunteerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  victimIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactRoleLabelVolunteer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
  },
  contactRoleLabelVictim: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE123C',
    textTransform: 'uppercase',
  },
  contactNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  callButtonVolunteer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  callButtonVictim: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  noPhoneText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },

  // Actions & Inputs
  actionSection: {
    gap: 6,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  mapLinkText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  enRouteBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 8,
  },
  descriptionText: {
    fontSize: 12,
    color: '#0369A1',
    fontStyle: 'italic',
  },

  // Delivery Code
  codeContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  codeValue: {
    fontSize: 32,
    letterSpacing: 6,
    fontWeight: '900',
    color: '#B45309',
    marginVertical: 8,
  },
  codeHelper: {
    fontSize: 11,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 16,
  },
  verifyCodeSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },

  // Confirmation & Complete
  confirmationBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  verifiedHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 6,
  },
  confirmStatusText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '500',
  },
  timestampText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'right',
  },
  collapsedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  collapsedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  collapsedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  collapsedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  completedMiniBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  completedMiniBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  collapsedSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  collapsedTapPrompt: {
    fontSize: 10,
    color: '#0D9488',
    fontWeight: '700',
    marginTop: 4,
  },
  collapseToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  collapseToggleText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
});
