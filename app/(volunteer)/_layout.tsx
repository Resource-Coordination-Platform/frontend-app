import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#33b5e5',
      headerShown: false // we gave every screen separate headers.so no need headershown 
    }}>
      <Tabs.Screen
        name="volunteer"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Disasters',
          tabBarIcon: ({ color }) => <Ionicons name="warning" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="donate"
        options={{
          title: 'Donate',
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report_a_event"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => <Ionicons name="megaphone" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live_crisis_map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />

  </Tabs>
  );
}