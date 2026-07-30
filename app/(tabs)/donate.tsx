import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

const BACKEND_URL = 'http://172.20.10.5:8002/api'; // Logistics Service එකේ Port එක (8002)

export default function DonateScreen() {
  const [needs, setNeeds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment Modal States
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [donateAmount, setDonateAmount] = useState('');
  const [payHereHtml, setPayHereHtml] = useState<string | null>(null);

  useEffect(() => {
    fetchNeeds();
  }, []);

  const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchNeeds = async () => {
    setIsLoading(true);
    try {
      const config = await getAuthHeader();
      const res = await axios.get(`${BACKEND_URL}/inventory/needs`, config);
      setNeeds(res.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'අඩුපාඩු ලැයිස්තුව ලබා ගැනීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNowClick = (item: any) => {
    setSelectedCategory(item);
    setDonateAmount('');
    setPayHereHtml(null);
    setIsPayModalVisible(true);
  };

  const startCheckout = async () => {
    const amount = parseFloat(donateAmount);
    if (!amount || amount < 100) {
      Alert.alert('අවධානයයි', 'අවම වශයෙන් රු. 100 ක මුදලක් ඇතුළත් කරන්න.');
      return;
    }

    try {
      const config = await getAuthHeader();
      const payload = {
        // tenant_id: selectedCategory.tenant_id, // <--- මේක අලුතින් දාන්න
        tenant_id:"ce2114c9-08f1-44e8-8aec-de9173fab9f1",
        category_id: "fd49baca-d81c-47c3-9ef6-86a3e7fad84d", // ID එක ගැලපෙන විදිහට බලලා දෙන්න
        amount: amount,
        quantity: 1 // දැනට එක පැකේජ් එකක් විදිහට යවමු
      };

      // Backend එකෙන් Hash එකයි Order ID එකයි ඉල්ලගන්නවා
      const res = await axios.post(`${BACKEND_URL}/payments/checkout`, payload, config);
      const payData = res.data;

      // WebView එක ඇතුළේ ලෝඩ් වෙන්න ඕනේ HTML Form එක හදනවා
      const htmlForm = `
        <html>
          <body onload="document.getElementById('payhere-form').submit();">
            <center><h2>Redirecting to PayHere...</h2></center>
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
    }
  };

  const handleWebViewNavigation = (navState: any) => {
    // PayHere එකෙන් අර අපි දීපු return_url එකට ආවම සල්ලි කැපිලා ඉවරයි කියලා අඳුරගන්නවා
    if (navState.url.includes('/success')) {
      setIsPayModalVisible(false);
      Alert.alert('Payment Successful! 🎉', 'ඔබගේ පරිත්‍යාගයට බොහොම ස්තූතියි!');
      fetchNeeds(); // ලිස්ට් එක රිෆ්‍රෙෂ් කරනවා
    } else if (navState.url.includes('/cancel')) {
      setIsPayModalVisible(false);
      Alert.alert('Payment Cancelled', 'ඔබ ගෙවීම අවලංගු කර ඇත.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🤝 අවශ්‍යතා හා පරිත්‍යාග</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#33b5e5" />
      ) : (
        <FlatList
          data={needs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.category}>{item.category_name}</Text>
                <Text style={styles.quantity}>හිඟ ප්‍රමාණය: <Text style={{color:'red'}}>{item.needed_quantity} {item.unit}</Text></Text>
                <Text style={styles.urgency}>තත්ත්වය: {item.urgency}</Text>
              </View>
              
              <View style={styles.btnGroup}>
                <TouchableOpacity style={styles.payBtn} onPress={() => handlePayNowClick(item)}>
                  <Text style={styles.payBtnText}>PayHere</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>දැනට හිඟ ද්‍රව්‍ය කිසිවක් නොමැත.</Text>}
        />
      )}

      {/* Payment Modal එක */}
      <Modal visible={isPayModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          {payHereHtml ? (
            // සල්ලි ගෙවන WebView එක
            <WebView 
              originWhitelist={['*']}
              source={{ html: payHereHtml }} 
              onNavigationStateChange={handleWebViewNavigation}
              style={{ flex: 1, marginTop: 40 }}
            />
          ) : (
            // ගාණ එන්ටර් කරන Form එක
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>පරිත්‍යාග කිරීම</Text>
              <Text style={{ marginBottom: 10 }}>ඔබ පරිත්‍යාග කිරීමට බලාපොරොත්තු වන {selectedCategory?.name} සඳහා මුදල (රු.):</Text>
              
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="උදා: 1500" 
                value={donateAmount}
                onChangeText={setDonateAmount}
              />
              
              <TouchableOpacity style={styles.submitBtn} onPress={startCheckout}>
                <Text style={styles.submitBtnText}>Proceed to Pay</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsPayModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f4f4', paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, flexDirection: 'row', elevation: 3 },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  category: { color: '#666', marginBottom: 5 },
  quantity: { fontWeight: 'bold' },
  urgency: { fontSize: 12, color: '#ff4444', marginTop: 5, fontWeight: 'bold' },
  btnGroup: { justifyContent: 'center', alignItems: 'center' },
  payBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 8, marginTop: 5, width: 80, alignItems: 'center' },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  modalContainer: { flex: 1, backgroundColor: '#f4f4f4' },
  modalContent: { flex: 1, padding: 20, justifyContent: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, fontSize: 18, backgroundColor: 'white', marginBottom: 20 },
  submitBtn: { backgroundColor: '#33b5e5', padding: 15, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 15, alignItems: 'center' },
  cancelBtnText: { color: '#ff4444', fontWeight: 'bold', fontSize: 16 }
});