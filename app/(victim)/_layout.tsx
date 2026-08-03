import { Tabs } from 'expo-router';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

export default function VictimTabLayout() {
  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: '#E53935', // රතු පාට Theme එක
        tabBarInactiveTintColor: '#757575',
        headerShown: true, // උඩින් Title Bar එක පෙන්වන්න
        headerStyle: { backgroundColor: '#E53935' },
        headerTintColor: '#fff',
        tabBarStyle: { paddingBottom: 5, height: 60 }
      }}
    >
      <Tabs.Screen
        name="victim"
        options={{
          title: 'මගේ තත්ත්වය',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="request_help"
        options={{
          title: 'හදිසි ආධාර ඉල්ලන්න',
          tabBarLabel: 'SOS',
          tabBarIcon: ({ color }) => <MaterialIcons name="emergency" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="safe_map"
        options={{
          title: 'ආරක්ෂිත ස්ථාන',
          tabBarLabel: 'Safe Zones',
          tabBarIcon: ({ color }) => <FontAwesome5 name="map-marked-alt" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'අනතුරු ඇඟවීම්',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <FontAwesome5 name="bell" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}