import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'sisu_auth_token';
const REFRESH_KEY = 'sisu_refresh_token';
const USER_KEY = 'sisu_auth_user';

// On phones the login token goes in the device's secure storage
// (Keychain / Keystore). The web has no secure storage, so it uses
// AsyncStorage there instead.
const useSecureStore = Platform.OS !== 'web';

export async function getToken() {
  try {
    return useSecureStore
      ? await SecureStore.getItemAsync(TOKEN_KEY)
      : await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

async function readSecret(key) {
  try {
    return useSecureStore
      ? await SecureStore.getItemAsync(key)
      : await AsyncStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

async function writeSecret(key, value) {
  if (useSecureStore) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

export async function saveToken(token) {
  await writeSecret(TOKEN_KEY, token);
}

// The refresh token lets the app get a new access token without asking the
// user to sign in again.
export function getRefreshToken() {
  return readSecret(REFRESH_KEY);
}

export async function saveRefreshToken(token) {
  await writeSecret(REFRESH_KEY, token);
}

// A small copy of the signed-in user (no password, no token), so the app
// can still open when the phone is offline.
export async function getSavedUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  try {
    if (useSecureStore) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_KEY);
    }

    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Could not clear the saved session:', error);
  }
}