import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { FontAwesome5 } from '@expo/vector-icons';

export default function SafeMapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);



  useEffect(() => {
    (async () => {
      try {
        // 1.get the location from user
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('අවධානයයි', 'සිතියම බැලීමට Location සඳහා අවසර ලබා දිය යුතුය.');
          setIsLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05, // oom level of the map
          longitudeDelta: 0.05,
        });



        // mock data for testing
        setSafeZones([
          { id: 1, name: 'අම්බලන්ගොඩ මධ්‍ය මහා විද්‍යාලය (සහන කඳවුර)', lat: loc.coords.latitude + 0.01, lng: loc.coords.longitude + 0.01, type: 'camp' },
          { id: 2, name: 'රතු කුරුස සංවිධානය - ගාල්ල ශාඛාව', lat: loc.coords.latitude - 0.015, lng: loc.coords.longitude - 0.01, type: 'medical' }
        ]);

      } catch (error) {
        console.error("Map Error:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E53935" />
        <Text style={{ marginTop: 10 }}>සිතියම සකසමින් පවතී...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>ඔබට ළඟම ඇති සහන කඳවුරු සහ වෛද්‍ය මධ්‍යස්ථාන සිතියමේ දැක්වේ.</Text>
      </View>

      {location ? (
        <MapView 
          style={styles.map} 
          initialRegion={location}
          showsUserLocation={true} // User live location showing in blue
        >
          
          {/*pin safe zones */}
          {safeZones.map((zone) => (
            <Marker
              key={zone.id}
              coordinate={{ latitude: zone.lat, longitude: zone.lng }}
              pinColor={zone.type === 'medical' ? 'red' : 'green'} // if medical show in red otherwise green
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{zone.name}</Text>
                  <Text style={styles.calloutSub}>මේ වෙත ගමන් කරන්න</Text>
                </View>
              </Callout>
            </Marker>
          ))}

        </MapView>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: 'red' }}>සිතියම ලබාගැනීමට නොහැකි විය.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15, backgroundColor: '#020202',zIndex: 1, elevation: 4  },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 13, color: '#ffebee', marginTop: 5 },
  map: { width: '100%', height: '100%' },
  callout: { padding: 5, alignItems: 'center' },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  calloutSub: { fontSize: 12, color: '#666' }
});