const DEV_AUTH_TOKEN_KEY = 'dev_auth_token'

export const getDevAuthToken = (): string => {
  return localStorage.getItem(DEV_AUTH_TOKEN_KEY) || ''
}

export const setDevAuthToken = (token: string) => {
  localStorage.setItem(DEV_AUTH_TOKEN_KEY, token)
}

export const clearDevAuthToken = () => {
  localStorage.removeItem(DEV_AUTH_TOKEN_KEY)
}
