// API Configuration for different environments

const isDevelopment = import.meta.env.DEV;

export const API_CONFIG = {
  // In development, use Vite's proxy (relative URLs)
  // In production, use environment variables (absolute URLs)
  BASE_URL: isDevelopment
    ? ''
    : (import.meta.env.VITE_API_BASE_URL || ''),

  WS_URL: isDevelopment
    ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host
    : (import.meta.env.VITE_WS_BASE_URL || ''),
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL;

  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // In development, return relative URL for Vite proxy
  if (isDevelopment) {
    return `/${cleanEndpoint}`;
  }

  // In production, return absolute URL
  return `${baseUrl}/${cleanEndpoint}`;
};

// Helper function to build WebSocket URL
export const buildWsUrl = (path: string): string => {
  const wsBaseUrl = API_CONFIG.WS_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  if (isDevelopment) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/${cleanPath}`;
  }

  return `${wsBaseUrl}/${cleanPath}`;
};