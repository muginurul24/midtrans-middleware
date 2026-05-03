const localhostFallbackApiBaseURL = 'http://localhost:8080'

function resolveApiBaseURL() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) {
    return configured
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  return localhostFallbackApiBaseURL
}

export const env = {
  apiBaseURL: resolveApiBaseURL(),
}
