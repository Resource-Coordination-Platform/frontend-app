import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, usePathname } from 'expo-router';
import { api } from './api';
import { useDeliveries } from './deliveries';

interface VolunteerTabsData {
  deliveries: ReturnType<typeof useDeliveries>;
  invitationCount: number;
  setInvitationCount: (count: number) => void;
}

const VolunteerTabsContext = createContext<VolunteerTabsData | null>(null);

export function VolunteerTabsProvider({ children }: { children: React.ReactNode }) {
  const deliveries = useDeliveries();
  const [invitationCount, setInvitationCount] = useState(0);
  const pathname = usePathname();
  const busy = useRef(false);

  // The dashboard publishes its own refreshed count while it is focused.
  // Keep its badge current when another tab is open, including on direct entry.
  useFocusEffect(useCallback(() => {
    if (pathname === '/volunteer') return;
    let active = true;
    const refresh = async () => {
      if (busy.current || AppState.currentState !== 'active') return;
      busy.current = true;
      try {
        const response = await api.post<{ status: string }[]>('/volunteer/assignments/sync', {});
        if (active) setInvitationCount(response.data.filter(item => item.status === 'NOTIFIED').length);
      } catch {
        // Preserve the last successful count and retry on the next refresh.
      } finally {
        busy.current = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [pathname]));

  return (
    <VolunteerTabsContext.Provider value={{ deliveries, invitationCount, setInvitationCount }}>
      {children}
    </VolunteerTabsContext.Provider>
  );
}

export function useVolunteerTabs() {
  const context = useContext(VolunteerTabsContext);
  if (!context) throw new Error('useVolunteerTabs must be used within VolunteerTabsProvider');
  return context;
}
