import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserSession() {
      // කලින් සේව් කරපු token එකයි role එකයි ගන්නවා
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

  // Check කරනකන් පොඩි ලෝඩින් එකක් පෙන්වනවා
  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // ලොග් වෙලා නම්, එයාගේ Role එක අනුව අදාල Dashboard එකට යවනවා (volunteer හෝ member)
  if (isLoggedIn) {
    return userRole === 'volunteer' ? <Redirect href="/volunteer" /> : <Redirect href="/victim" />;
  }

  // මුකුත් නැත්නම් Welcome එකට යවනවා
  return <Redirect href="/welcome" />;
}