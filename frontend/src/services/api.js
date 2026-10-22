import { API_URL, REQUEST_TIMEOUT_MS } from '../config';
import {
  getToken,
  saveToken,
  getRefreshToken,
  saveRefreshToken,
} from './sessionStorage';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Called when the server says our saved token is no longer valid
// (expired, or the account is gone), so the app can sign the user out.
let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// Trades the saved refresh token for a new access token. Several requests can
// fail at the same moment when a token expires, so they all share one refresh
// (each refresh token only works once).
let refreshInFlight = null;

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        return false;
      }

      try {
        const data = await send('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
          token: null,
        });

        await saveToken(data.token);
        await saveRefreshToken(data.refreshToken);

        return true;
      } catch (error) {
        // No connection: keep the session and let the caller retry later.
        if (error.status === 0) {
          throw error;
        }

        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  let token = auth ? await getToken() : null;

  try {
    return await send(path, { method, body, token });
  } catch (error) {
    // The access token has expired: refresh it once and try again.
    if (error.status === 401 && token) {
      const refreshed = await refreshSession();

      if (refreshed) {
        token = await getToken();

        return send(path, { method, body, token });
      }

      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    throw error;
  }
}

async function send(path, { method, body, token }) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      error && error.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the Sisu server. Check your connection and try again.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    // The response had no JSON body.
  }

  if (!response.ok) {
    throw new ApiError(
      (data && data.message) || 'Something went wrong. Please try again.',
      response.status
    );
  }

  return data;
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

// Ends the session on the server. Errors are ignored: the phone forgets the
// session either way.
export async function logout() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return;
  }

  try {
    await send('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      token: null,
    });
  } catch (error) {
    // Offline or server down.
  }
}

export function register(name, email, password) {
  return request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
    auth: false,
  });
}

export function applyAsVet(name, email, password) {
  return request('/api/auth/apply-as-vet', {
    method: 'POST',
    body: { name, email, password },
    auth: false,
  });
}

// Returns { user: { userId, role, vetApprovalStatus } } for the saved token.
export function getMe() {
  return request('/api/auth/me');
}