import axios, { isAxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken, saveAuthTokens } from './api';

const KEY = 'pending_victim_registration';
const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
export type PendingRegistration = {
  email: string; password: string; full_name: string; phone?: string;
  latitude?: number; longitude?: number;
};

export async function readPendingRegistration(): Promise<PendingRegistration | null> {
  const value = await SecureStore.getItemAsync(KEY);
  return value ? JSON.parse(value) : null;
}

export async function savePendingRegistration(details: PendingRegistration) {
  const existing = await readPendingRegistration();
  if (existing && existing.email !== details.email) {
    throw new Error('Finish syncing the saved registration before registering another account.');
  }
  await SecureStore.setItemAsync(KEY, JSON.stringify(details), options);
}

export function clearPendingRegistration() {
  return SecureStore.deleteItemAsync(KEY);
}

// A 409 can mean registration succeeded but its response was lost. Only the
// original password may recover that account; never upload using another session.
export async function registerPendingVictim(location?: { latitude: number | null; longitude: number | null }) {
  const pending = await readPendingRegistration();
  if (!pending) return null;
  const latitude = pending.latitude ?? location?.latitude;
  const longitude = pending.longitude ?? location?.longitude;
  if (latitude == null || longitude == null) return null;
  await savePendingRegistration({ ...pending, latitude, longitude });
  const config = { timeout: 15000 };
  const base = process.env.EXPO_PUBLIC_BACKEND_URL;
  try {
    await axios.post(`${base}/auth/register`, { ...pending, latitude, longitude, user_type: 'VICTIM' }, config);
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 409) throw error;
  }
  const { data } = await axios.post(`${base}/auth/login`, {
    email: pending.email, password: pending.password,
  }, config);
  const claims = jwtDecode<{ sub: string; user_type: string }>(data.access_token);
  if (claims.user_type !== 'VICTIM') throw new Error('The saved email does not belong to a victim account.');
  const current = await getAccessToken();
  if (current && jwtDecode<{ sub: string }>(current).sub !== claims.sub) {
    throw new Error('Sign out of the other account to sync your saved registration.');
  }
  await saveAuthTokens({ accessToken: data.access_token, refreshToken: data.refresh_token,
    userRole: 'VICTIM', tenantId: data.tenant_id });
  return { email: pending.email, userId: claims.sub, token: data.access_token as string };
}
