import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../services/api';
import {
  getToken,
  saveToken,
  saveRefreshToken,
  getSavedUser,
  saveUser,
  clearSession,
} from '../services/sessionStorage';

// status: 'loading' (checking saved login) | 'signedOut' | 'signedIn'
export default function useSession() {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const signedInRef = useRef(false);

  const signOut = useCallback(async () => {
    signedInRef.current = false;
    // Revoke the session on the server first (best effort), then forget it.
    await api.logout();
    await clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Fetches the current account details (role and vet approval status
  // come from the server, not from the token).
  async function loadAccount(loginUser) {
    const { user: me } = await api.getMe();

    return {
      id: me.userId,
      name: loginUser ? loginUser.name : undefined,
      email: loginUser ? loginUser.email : undefined,
      role: me.role,
      vetApprovalStatus: me.vetApprovalStatus,
    };
  }

  // Restore a saved login when the app opens.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = await getToken();

      if (!token) {
        if (!cancelled) setStatus('signedOut');
        return;
      }

      const saved = await getSavedUser();

      try {
        const account = await loadAccount(saved);

        if (cancelled) return;

        const merged = { ...saved, ...account };

        await saveUser(merged);
        signedInRef.current = true;
        setUser(merged);
        setStatus('signedIn');
      } catch (error) {
        if (cancelled) return;

        // 401 means the token expired or the account is gone. The api
        // layer already signed us out in that case.
        if (error.status === 401 || !saved) {
          await signOut();
          return;
        }

        // Offline (or the server is down): keep the user in with their
        // saved details.
        signedInRef.current = true;
        setUser(saved);
        setStatus('signedIn');
      }
    }

    api.setUnauthorizedHandler(() => {
      if (signedInRef.current) {
        signOut();
      }
    });

    restore();

    return () => {
      cancelled = true;
      api.setUnauthorizedHandler(null);
    };
  }, [signOut]);

  async function signIn(email, password) {
    const data = await api.login(email, password);

    await saveToken(data.token);

    if (data.refreshToken) {
      await saveRefreshToken(data.refreshToken);
    }

    try {
      const account = await loadAccount(data.user);
      const merged = { ...data.user, ...account };

      await saveUser(merged);
      signedInRef.current = true;
      setUser(merged);
      setStatus('signedIn');
    } catch (error) {
      await clearSession();
      throw error;
    }
  }

  // Re-reads the account from the server, e.g. to see whether a veterinarian
  // application has been approved.
  async function refreshAccount() {
    const account = await loadAccount(user);
    const merged = { ...user, ...account };

    await saveUser(merged);
    setUser(merged);

    return merged;
  }

  async function signUp(name, email, password) {
    await api.register(name, email, password);
    await signIn(email, password);
  }

  // Vets are not signed in after applying: an admin must approve them first.
  async function applyAsVet(name, email, password) {
    const data = await api.applyAsVet(name, email, password);

    return data.message;
  }

  return { status, user, signIn, signUp, applyAsVet, signOut, refreshAccount };
}