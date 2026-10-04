import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from './api';

export interface Delivery {
  id: string; victim_request_id: string; district: string; status: string;
  pickup_name: string; pickup_latitude: number; pickup_longitude: number;
  destination_latitude: number | null; destination_longitude: number | null;
  description: string | null; needs: string[]; 
  volunteer_name: string | null; volunteer_phone: string | null;
  victim_name: string | null; victim_phone: string | null;
  delivery_code: string | null; created_at: string; updated_at: string;
  handed_over_at: string | null; code_verified_at: string | null;
  volunteer_confirmed_at: string | null; victim_confirmed_at: string | null;
  completed_at: string | null;
  lines: { id: string; name: string; quantity: number; unit: string }[];
  history: { action: string; created_at: string }[];
}

export const deliveryLabels: Record<string, string> = {
  RESERVED: 'ආධාර වෙන් කර ඇත — බෙදාහැරීම සංවිධානය කරමින්',
  OPEN: 'Volunteer කෙනෙකු බලාපොරොත්තුවෙන්', ACCEPTED: 'Volunteer භාරගෙන ඇත',
  COLLECTED: 'මධ්‍යස්ථානයෙන් භාණ්ඩ භාරදී ඇත', EN_ROUTE: 'භාණ්ඩ රැගෙන පැමිණෙමින්',
  CODE_VERIFIED: 'Delivery code තහවුරු කර ඇත', AWAITING_CONFIRMATION: 'භාරදීමේ තහවුරු කිරීම් බලාපොරොත්තුවෙන්',
  COMPLETED: 'භාණ්ඩ භාරදීම සම්පූර්ණයි',
};

export function useDeliveries() {
  const [data, setData] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const response = await api.get<Delivery[]>('/volunteers/deliveries');
      setData(response.data);
      setError(null);
    } catch {
      setError('Delivery තොරතුරු යාවත්කාලීන කළ නොහැක. නැවත උත්සාහ කරන්න.');
    } finally { busy.current = false; setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 5000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [refresh]));
  return { data, loading, error, refresh };
}
