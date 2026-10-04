import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';
import { syncHelpRequests } from './help-requests';

const TASK = 'background-sync-task';
let running: Promise<number> | null = null;
export function syncWhenConnected(): Promise<number> {
  if (running) return running;
  running = (async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) return 0;
    return syncHelpRequests();
  })().finally(() => { running = null; });
  return running;
}

TaskManager.defineTask(TASK, async () => {
  try {
    return await syncWhenConnected() ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  if (Platform.OS === 'web' || !await TaskManager.isAvailableAsync()) return;
  await BackgroundFetch.registerTaskAsync(TASK, {
    minimumInterval: 60, stopOnTerminate: false, startOnBoot: true,
  });
}

export function startOfflineSync() {
  const retry = () => { void syncWhenConnected().catch(() => undefined); };
  void registerBackgroundSync().catch(() => console.warn('Background sync unavailable in this build.'));
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) retry();
  });
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active' || state === 'background') retry();
  });
  const interval = setInterval(retry, 30000);
  retry();
  return () => { unsubscribe(); subscription.remove(); clearInterval(interval); };
}
