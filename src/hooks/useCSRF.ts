'use client';

import { useState, useEffect } from 'react';

interface CSRFState {
  token: string | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CSRFHeaders {
  'x-csrf-token': string;
  'x-session-id': string;
}

export function useCSRF() {
  const [state, setState] = useState<CSRFState>({
    token: null,
    sessionId: null,
    isLoading: true,
    error: null,
  });

  // Generate a session ID for this browser session
  const generateSessionId = (): string => {
    const existing = sessionStorage.getItem('csrf-session-id');
    if (existing) return existing;

    const newSessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    sessionStorage.setItem('csrf-session-id', newSessionId);
    return newSessionId;
  };

  // Fetch CSRF token from the server
  const fetchCSRFToken = async (sessionId: string): Promise<string | null> => {
    try {
      const response = await fetch(window.location.pathname, {
        method: 'GET',
        headers: {
          'x-session-id': sessionId,
        },
      });

      if (response.ok) {
        const token = response.headers.get('X-CSRF-Token');
        return token;
      }

      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    } catch (error) {
      console.error('CSRF token fetch error:', error);
      throw error;
    }
  };

  // Initialize CSRF token on component mount
  useEffect(() => {
    const initializeCSRF = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const sessionId = generateSessionId();
        const token = await fetchCSRFToken(sessionId);

        if (token) {
          setState({
            token,
            sessionId,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error('No CSRF token received');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to initialize CSRF',
        }));
      }
    };

    initializeCSRF();
  }, []);

  // Refresh CSRF token
  const refreshToken = async (): Promise<void> => {
    if (!state.sessionId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const token = await fetchCSRFToken(state.sessionId);

      if (token) {
        setState(prev => ({
          ...prev,
          token,
          isLoading: false,
          error: null,
        }));
      } else {
        throw new Error('No CSRF token received on refresh');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to refresh CSRF token',
      }));
    }
  };

  // Get headers for API requests
  const getCSRFHeaders = (): CSRFHeaders | null => {
    if (!state.token || !state.sessionId) {
      return null;
    }

    return {
      'x-csrf-token': state.token,
      'x-session-id': state.sessionId,
    };
  };

  // Make an authenticated API request with CSRF headers
  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const csrfHeaders = getCSRFHeaders();

    if (!csrfHeaders) {
      throw new Error('CSRF token not available');
    }

    const headers = new Headers(options.headers);
    headers.set('x-csrf-token', csrfHeaders['x-csrf-token']);
    headers.set('x-session-id', csrfHeaders['x-session-id']);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get a 403, try refreshing the token once
    if (response.status === 403 && response.statusText.includes('CSRF')) {
      console.log('CSRF token may be expired, attempting refresh...');

      await refreshToken();

      const newHeaders = getCSRFHeaders();
      if (newHeaders) {
        headers.set('x-csrf-token', newHeaders['x-csrf-token']);
        headers.set('x-session-id', newHeaders['x-session-id']);

        return fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  };

  return {
    ...state,
    refreshToken,
    getCSRFHeaders,
    authenticatedFetch,
    isReady: !state.isLoading && !!state.token && !!state.sessionId,
  };
}
