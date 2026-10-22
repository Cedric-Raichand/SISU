import { API_URL, REQUEST_TIMEOUT_MS } from '../config';
import { getToken } from './sessionStorage';

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

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let token = null;

  if (auth) {
    token = await getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
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
    // Only treat 401 as "signed out" for requests that sent a token.
    if (response.status === 401 && token && unauthorizedHandler) {
      unauthorizedHandler();
    }

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