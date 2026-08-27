import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

export default function DonateScreen() {
  const [needs, setNeeds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment Modal States
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [donateAmount, setDonateAmount] = useState('');
  const [payHereHtml, setPayHereHtml] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchNeeds();
  }, []);

  const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchNeeds = async () => {
    try {
      const config = await getAuthHeader();
      const res = await axios.get(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/inventory/needs`,
        config
      );
      setNeeds(res.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'අඩුපාඩු ලැයිස්තුව ලබා ගැනීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNeeds();
  };

  const handlePayNowClick = (item: any) => {
    setSelectedCategory(item);
    setDonateAmount('1000');
    setPayHereHtml(null);
    setIsPayModalVisible(true);
  };

  const startCheckout = async () => {
    const amount = parseFloat(donateAmount);
    if (!amount || amount < 100) {
      Alert.alert('අවධානයයි', 'අවම වශයෙන් රු. 100 ක මුදලක් ඇතුළත් කරන්න.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const config = await getAuthHeader();
      const payload = {
        tenant_id: selectedCategory?.tenant_id || 'ce2114c9-08f1-44e8-8aec-de9173fab9f1',
        category_id: selectedCategory?.category_id || 'fd49baca-d81c-47c3-9ef6-86a3e7fad84d',
        amount: amount,
        quantity: 1,
      };

      const res = await axios.post(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/payments/checkout`,
        payload,
        config
      );
      const payData = res.data;

      const htmlForm = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #F8FAFC; }
              .spinner { border: 4px solid #E2E8F0; border-top: 4px solid #00897B; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              h3 { color: #1E293B; margin-top: 16px; font-size: 16px; }
            </style>
          </head>
          <body onload="document.getElementById('payhere-form').submit();">
            <div class="spinner"></div>
            <h3>Redirecting to PayHere...</h3>
            <form id="payhere-form" method="post" action="https://sandbox.payhere.lk/pay/checkout">
                <input type="hidden" name="merchant_id" value="${payData.merchant_id}">
                <input type="hidden" name="return_url" value="http://localhost:8081/success">
                <input type="hidden" name="cancel_url" value="http://localhost:8081/cancel">
                <input type="hidden" name="notify_url" value="http://YOUR_NGROK_URL/api/payments/webhook">
                <input type="hidden" name="order_id" value="${payData.order_id}">
                <input type="hidden" name="items" value="${payData.items}">
                <input type="hidden" name="currency" value="${payData.currency}">
                <input type="hidden" name="amount" value="${payData.amount}">
                <input type="hidden" name="first_name" value="Volunteer">
                <input type="hidden" name="last_name" value="User">
                <input type="hidden" name="email" value="volunteer@rcp.com">
                <input type="hidden" name="phone" value="0771234567">
                <input type="hidden" name="address" value="Colombo">
                <input type="hidden" name="city" value="Colombo">
                <input type="hidden" name="country" value="Sri Lanka">
                <input type="hidden" name="hash" value="${payData.hash}">
            </form>
          </body>
        </html>
      `;
      setPayHereHtml(htmlForm);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Payment Gateway එකට සම්බන්ධ වීමට නොහැකි විය.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleWebViewNavigation = (navState: any) => {
    if (navState.url.includes('/success')) {
      setIsPayModalVisible(false);
      Alert.alert('Payment Successful! 🎉', 'ඔබගේ පරිත්‍යාගයට බොහොම ස්තූතියි!');
      fetchNeeds();
    } else if (navState.url.includes('/cancel')) {
      setIsPayModalVisible(false);
      Alert.alert('Payment Cancelled', 'ඔබ ගෙවීම අවලංගු කර ඇත.');
    }
  };

  const getItemIcon = (name: string = '', cat: string = '') => {
    const text = (name + ' ' + cat).toLowerCase();
    if (text.includes('food') || text.includes('කෑම') || text.includes('සහල්') || text.includes('rations'))
      return 'utensils';
    if (text.includes('water') || text.includes('ජලය')) return 'tint';
    if (text.includes('med') || text.includes('බෙහෙත්') || text.includes('drugs')) return 'briefcase-medical';
    if (text.includes('cloth') || text.includes('ඇඳුම්')) return 'tshirt';
    if (text.includes('tent') || text.includes('shelter') || text.includes('නවාතැන්')) return 'campground';
    return 'box-open';
  };

  const renderNeedCard = ({ item }: { item: any }) => {
    const isCritical = item.urgency === 'CRITICAL' || item.urgency === 'HIGH';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name={getItemIcon(item.name, item.category_name)} size={18} color="#00897B" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.categoryName}>{item.category_name || 'General Relief'}</Text>
          </View>
          <View
            style={[
              styles.urgencyBadge,
              {
                backgroundColor: isCritical ? '#FEF2F2' : '#F0FDF4',
                borderColor: isCritical ? '#FECACA' : '#BBF7D0',
              },
            ]}
          >
            <Text
              style={[
                styles.urgencyText,
                { color: isCritical ? '#DC2626' : '#16A34A' },
              ]}
            >
              {item.urgency || 'NORMAL'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.qtyLabel}>අවශ්‍ය හිඟ ප්‍රමාණය</Text>
            <Text style={styles.qtyValue}>
              {item.needed_quantity} <Text style={styles.qtyUnit}>{item.unit || 'Units'}</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.donateBtn}
            onPress={() => handlePayNowClick(item)}
            activeOpacity={0.85}
          >
            <FontAwesome5 name="hand-holding-heart" size={14} color="#FFFFFF" />
            <Text style={styles.donateBtnText}>ආධාර කරන්න</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Header --- */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>අවශ්‍යතා හා පරිත්‍යාග</Text>
              <Text style={styles.headerSubtitle}>
                ආපදාවට ලක්වූවන්ට අවශ්‍ය අත්‍යවශ්‍ය ද්‍රව්‍ය හා මුදල් ආධාර
              </Text>
            </View>
            <View style={styles.headerIconCircle}>
              <FontAwesome5 name="heart" size={18} color="#80CBC4" />
            </View>
          </View>
        </View>

        {/* --- Content --- */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#00897B" />
            <Text style={styles.loadingText}>අවශ්‍යතා ලැයිස්තුව ලබාගනිමින් පවතී...</Text>
          </View>
        ) : needs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <FontAwesome5 name="check-circle" size={38} color="#00897B" />
            </View>
            <Text style={styles.emptyTitle}>දැනට හිඟ ද්‍රව්‍ය කිසිවක් නොමැත</Text>
            <Text style={styles.emptySub}>
              සියලුම ආපදා මධ්‍යස්ථාන වෙත ප්‍රමාණවත් තරම් සහනාධාර ලැබී ඇත.
            </Text>
          </View>
        ) : (
          <FlatList
            data={needs}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={renderNeedCard}
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

        {/* --- Payment Modal --- */}
        <Modal
          visible={isPayModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsPayModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#041F1A' }}>
            {payHereHtml ? (
              <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                <View style={styles.modalTopBar}>
                  <Text style={styles.modalTopBarTitle}>PayHere Secure Payment</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setIsPayModalVisible(false)}
                  >
                    <MaterialIcons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: payHereHtml }}
                  onNavigationStateChange={handleWebViewNavigation}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <View style={styles.modalBodyContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>මුදලින් පරිත්‍යාග කරන්න</Text>
                    <Text style={styles.modalSub}>
                      {selectedCategory?.name || 'සහනාධාර'} සඳහා ආධාර යොමු කරන්න
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => setIsPayModalVisible(false)}
                  >
                    <MaterialIcons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Selected Item Summary Card */}
                  <View style={styles.selectedItemCard}>
                    <FontAwesome5 name="hands-helping" size={20} color="#00897B" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.selectedItemName}>{selectedCategory?.name}</Text>
                      <Text style={styles.selectedItemCategory}>
                        කාණ්ඩය: {selectedCategory?.category_name || 'General'}
                      </Text>
                    </View>
                  </View>

                  {/* Preset Amount Chips */}
                  <Text style={styles.sectionLabel}>පරිත්‍යාග මුදල තෝරන්න (රු.)</Text>
                  <View style={styles.presetsRow}>
                    {PRESET_AMOUNTS.map(amt => {
                      const isSelected = donateAmount === amt.toString();
                      return (
                        <TouchableOpacity
                          key={amt}
                          style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                          onPress={() => setDonateAmount(amt.toString())}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isSelected && styles.presetChipTextSelected,
                            ]}
                          >
                            රු. {amt.toLocaleString()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Amount Input */}
                  <Text style={styles.sectionLabel}>නැතහොත් වෙනත් මුදලක් ඇතුළත් කරන්න:</Text>
                  <View style={styles.amountInputWrapper}>
                    <Text style={styles.currencyPrefix}>LKR</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      placeholder="1000"
                      value={donateAmount}
                      onChangeText={setDonateAmount}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <Text style={styles.helperText}>
                    * ආරක්ෂිත PayHere Payment Gateway හරහා ක්‍රෙඩිට්/ඩෙබිට් කාඩ් හෝ eZ Cash මගින් ගෙවිය හැක.
                  </Text>
                </ScrollView>

                {/* Checkout Button */}
                <TouchableOpacity
                  style={[styles.checkoutBtn, isCheckingOut && { opacity: 0.7 }]}
                  onPress={startCheckout}
                  disabled={isCheckingOut}
                  activeOpacity={0.85}
                >
                  {isCheckingOut ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome5 name="lock" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.checkoutBtnText}>
                        රු. {donateAmount || '0'} ක් පරිත්‍යාග කරන්න
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsPayModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>අවලංගු කරන්න (Cancel)</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Modal>
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
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 137, 123, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- List Content --- */
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  categoryName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E11D48',
    marginTop: 2,
  },
  qtyUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00897B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#00897B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  donateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* --- Modal Styles --- */
  modalTopBar: {
    backgroundColor: '#041F1A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTopBarTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBodyContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    marginBottom: 16,
  },
  selectedItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00695C',
  },
  selectedItemCategory: {
    fontSize: 12,
    color: '#00897B',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  presetChipSelected: {
    backgroundColor: '#00897B',
    borderColor: '#00796B',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#00897B',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00897B',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 20,
  },
  checkoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00897B',
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#00897B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});