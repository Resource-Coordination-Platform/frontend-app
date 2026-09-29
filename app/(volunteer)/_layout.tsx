import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

export default function VolunteerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00897B', // Volunteer Teal theme
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="volunteer"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="hands-helping" size={focused ? 22 : 20} color={color} />
          ),
        }}
      />


      <Tabs.Screen name="deliveries" options={{ title: 'Deliveries', tabBarIcon: ({ color }) => <FontAwesome5 name="truck" size={20} color={color} /> }} />
      <Tabs.Screen
        name="report_a_event"
        options={{
          title: 'Report',
          tabBarLabel: 'Report',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="add-alert" size={focused ? 24 : 22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="donations"
        options={{
          title: 'Donations',
          tabBarLabel: 'Donations',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="hand-holding-heart" size={focused ? 22 : 20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
