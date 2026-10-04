import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { getAccessToken, getRefreshToken, getUserRole } from '../services/api';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserSession() {
      const token = await getAccessToken();
      const refreshToken = await getRefreshToken();
      const role = await getUserRole(); 
      
      if ((token || refreshToken) && role) {
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

  // if logged in navigate to dashboard by userRole
  if (isLoggedIn) {
    if (userRole?.toUpperCase() === 'GRAMA_NILADHARI') return <Redirect href="/grama-niladhari" />;
    return userRole?.toUpperCase() === 'VOLUNTEER' ? <Redirect href="/volunteer" /> : <Redirect href="/victim" />;
  }

  // if not logged in redirect to welcome screen
  return <Redirect href="/welcome" />;
}