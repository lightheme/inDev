const DEFAULT_API_BASE_URL = 'http://localhost:3000/api'

const ensureApiSuffix = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/+$/, '')

  if (trimmed.endsWith('/api')) {
    return trimmed
  }

  return `${trimmed}/api`
}

export const getApiBaseUrl = () => {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

  return ensureApiSuffix(rawBaseUrl)
}
