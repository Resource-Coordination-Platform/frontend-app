import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { VolunteerTabsProvider, useVolunteerTabs } from '../../services/volunteer-tabs';

export default function VolunteerTabLayout() {
  return (
    <VolunteerTabsProvider>
      <StatusBar style="light" />
      <VolunteerTabs />
    </VolunteerTabsProvider>
  );
}

function VolunteerTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const { deliveries, invitationCount } = useVolunteerTabs();
  const deliveryInvitationCount = deliveries.data.filter(item => item.status === 'OPEN').length;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00897B', // Volunteer Teal theme
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFFFFF', fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
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
          tabBarBadge: invitationCount || undefined,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="hands-helping" size={focused ? 22 : 20} color={color} />
          ),
        }}
      />


      <Tabs.Screen name="deliveries" options={{ title: 'Deliveries', tabBarBadge: deliveryInvitationCount || undefined, tabBarIcon: ({ color }) => <FontAwesome5 name="truck" size={20} color={color} /> }} />
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
