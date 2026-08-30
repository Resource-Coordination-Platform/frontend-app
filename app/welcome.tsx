import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        
        {/* --- Header Section --- */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/icon2.png')} 
              style={styles.logoImage} 
            />
          </View>
          <Text style={styles.title}>සහස්‍ර (Sahasra)</Text>
          <Text style={styles.subtitle}>ආපදා කළමනාකරණ පද්ධතිය</Text>
          
        </View>

        {/* --- Action Buttons (Cards) --- */}
        <View style={styles.buttonContainer}>
          
          {/* Victim Button */}
          <TouchableOpacity 
            style={[styles.cardButton, styles.victimCard]} 
            onPress={() => router.push('/register-victim')}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <FontAwesome5 name="life-ring" size={24} color="#E53935" />
            </View>
            <View style={styles.btnTextContainer}>
              <Text style={styles.btnTitle}>මට උදව් අවශ්‍යයි</Text>
              <Text style={styles.btnSub}>I Need Help</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Helper/Volunteer Button */}
          <TouchableOpacity 
            style={[styles.cardButton, styles.helperCard]} 
            onPress={() => router.push('/register-helper')}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <FontAwesome5 name="hands-helping" size={24} color="#00897B" />
            </View>
            <View style={styles.btnTextContainer}>
              <Text style={styles.btnTitle}>මට උදව් කළ හැක</Text>
              <Text style={styles.btnSub}>Offer Help</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="#fff" />
          </TouchableOpacity>

        </View>

        {/* --- Login Section --- */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>දැනටමත් ගිණුමක් තිබේද?</Text>
          <TouchableOpacity 
            style={styles.loginBtn} 
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginBtnText}>පිවිසෙන්න (Login)</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6', 
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-evenly',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4, // Android Shadow
    shadowColor: '#000', // iOS Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  victimCard: {
    backgroundColor: '#E53935', // Premium Red
  },
  helperCard: {
    backgroundColor: '#00897B', // Premium Teal/Green
  },
  iconCircle: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  btnTextContainer: {
    flex: 1,
  },
  btnTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  btnSub: {
    color: '#rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 15,
    marginBottom: 10,
  },
  loginBtn: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loginBtnText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
});