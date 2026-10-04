import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VictimTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <>
    <StatusBar style="light" />
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: '#E53935', // red theme
        tabBarInactiveTintColor: '#757575',
        headerShown: true, // for showing the header in each tab
        headerTitle: '',
        headerStyle: { backgroundColor: '#E53935', height: insets.top + 28 },
        headerTintColor: '#fff',
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: 56 + bottomPadding },
        sceneStyle: { paddingLeft: insets.left, paddingRight: insets.right },
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
    </>
  );
}
