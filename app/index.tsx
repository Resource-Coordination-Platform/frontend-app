import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserSession() {
      const token = await SecureStore.getItemAsync('access_token');
      const role = await SecureStore.getItemAsync('user_role'); 
      
      if (token && role) {
        setIsLoggedIn(true);
        setUserRole(role);
      } else {
        setIsLoggedIn(false);
      }
    }
    checkUserSession();
  }, []);

  // show loading screen while checking
  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  //if logged in navigate to dashbord by userRole
  if (isLoggedIn) {
    return userRole === 'volunteer' ? <Redirect href="/volunteer" /> : <Redirect href="/victim" />;
  }

  // if not logged in redirect to welcome screen
  return <Redirect href="/welcome" />;
}