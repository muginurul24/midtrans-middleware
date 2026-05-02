const fallbackApiBaseURL = 'http://localhost:8080'

export const env = {
  apiBaseURL: import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseURL,
}

