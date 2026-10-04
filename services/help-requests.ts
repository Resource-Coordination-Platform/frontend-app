import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getAccessToken } from './api';
import { jwtDecode } from 'jwt-decode';
import { readPendingRegistration, registerPendingVictim, clearPendingRegistration } from './offline-registration';

export type RequestedItem = { code: string; label: string; quantity: number | null; unit: string; category_id?: string | null };
export type OfflineHelpRequest = {
  registration_email?: string; user_id?: string;
  id: string; disaster: string; needs: string[]; requested_items?: RequestedItem[];
  description: string; latitude: number | null; longitude: number | null;
};

export type ResourceCategory = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  is_active: boolean;
};

// Default hardcoded units as fallback when categories haven't loaded yet
export const NEED_UNITS: Record<string, string> = {
  cooked_food: 'meal packs', dry_rations: 'packs', water: 'litres', medical: 'people',
  rescue: 'people', shelter: 'people', clothes: 'sets',
};

// Build a units map from fetched categories
export function buildUnitsMap(categories: ResourceCategory[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of categories) {
    map[cat.id] = cat.unit;
  }
  return map;
}

export async function fetchCategories(): Promise<ResourceCategory[]> {
  try {
    const token = await getAccessToken();
    if (!token) return [];
    // Use the inventory categories endpoint (accepts any authenticated user)
    // Victim JWT has tenant_id = assigned_tenant_id, so filtering works correctly
    const response = await api.get('/inventory/categories');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.log('Categories: user not authenticated or insufficient permissions');
    } else {
      console.error('Failed to fetch categories:', error);
    }
    return [];
  }
}

export function newHelpRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Serialize foreground/background queue changes. Remove only acknowledged IDs;
// a failed or interrupted upload keeps the same idempotency key for its retry.
let queueLock: Promise<unknown> = Promise.resolve();
function locked<T>(action: () => Promise<T>): Promise<T> {
  const result = queueLock.then(action, action);
  queueLock = result.catch(() => undefined);
  return result;
}
export async function readOfflineHelpRequests(): Promise<OfflineHelpRequest[]> {
  return JSON.parse(await AsyncStorage.getItem('offline_requests') || '[]');
}
export function enqueueHelpRequest(request: OfflineHelpRequest) {
  return locked(async () => {
    const rows = await readOfflineHelpRequests();
    const pending = await readPendingRegistration();
    const token = await getAccessToken();
    if (!request.registration_email && !request.user_id) {
      if (pending) request.registration_email = pending.email;
      else if (token) request.user_id = jwtDecode<{ sub: string }>(token).sub;
    }
    const existing = rows.findIndex(row => row.id === request.id);
    if (existing >= 0) rows[existing] = request;
    else rows.push(request);
    await AsyncStorage.setItem('offline_requests', JSON.stringify(rows));
    return rows.length;
  });
}
export function syncHelpRequests() {
  return locked(async () => {
    const rows = await readOfflineHelpRequests();
    const pending = await readPendingRegistration();
    const registration = await registerPendingVictim(rows.find(row => row.registration_email === pending?.email));
    const token = registration?.token || await getAccessToken();
    const user = token ? jwtDecode<{ sub: string; user_type: string }>(token) : null;
    if (rows.length && !await getAccessToken()) throw new Error('Saved on this phone. Sign in as a victim to send and track your request.');
    let sent = 0;
    for (const request of rows) {
      if (user?.user_type !== 'VICTIM' ||
          (request.user_id && request.user_id !== user.sub) ||
          (request.registration_email && request.registration_email !== registration?.email)) {
        throw new Error('Sign in with the account that saved this request.');
      }
      if (!request.requested_items?.length) {
        throw new Error('An older saved request has no quantities. Review it before sending.');
      }
      await api.post('/requests/help', {
        client_request_id: request.id, disaster_type: request.disaster,
        requested_items: request.requested_items, description: request.description || '',
        latitude: request.latitude, longitude: request.longitude,
      }, { headers: { Authorization: `Bearer ${token}` } });
      sent += 1;
      await AsyncStorage.setItem('offline_requests', JSON.stringify(rows.slice(sent)));
    }
    if (registration) await clearPendingRegistration();
    return sent;
  });
}

export function formatRequestedItems(items?: RequestedItem[], needs?: string[]) {
  if (items?.length) return items.map(item => `${item.label}: ${item.quantity == null ? 'ප්‍රමාණය සඳහන් කර නැත' : `${item.quantity} ${item.unit}`}`).join('\n');
  return needs?.map(need => need.replace('other:', '').replace(/_/g, ' ')).join(', ') || '';
}
