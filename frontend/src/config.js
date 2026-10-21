import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 5000;

// Where the Sisu backend lives.
//
// 1. EXPO_PUBLIC_API_URL wins if set (use it for a deployed server, e.g.
//    EXPO_PUBLIC_API_URL=https://api.example.com in frontend/.env).
// 2. On a phone running through Expo, the dev machine's address is already
//    known (it is the one serving the app), so we reuse it with the API port.
// 3. On web, the backend is on localhost.
// 4. The Android emulator reaches the host machine through 10.0.2.2.
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  if (Platform.OS === 'web') {
    return `http://localhost:${API_PORT}`;
  }

  const hostUri =
    (Constants.expoConfig && Constants.expoConfig.hostUri) ||
    (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost) ||
    '';
  const host = hostUri.split(':')[0];

  if (host) {
    return `http://${host}:${API_PORT}`;
  }

  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();
export const REQUEST_TIMEOUT_MS = 15000;