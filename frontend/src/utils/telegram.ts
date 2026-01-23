declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
          }
          auth_date?: number
          hash?: string
        }
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
          secondary_bg_color?: string
        }
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
      }
    }
  }
}

export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp
}

export const getTelegramInitData = (): string => {
  if (isTelegramWebApp()) {
    return window.Telegram!.WebApp.initData
  }
  return ''
}

export const getTelegramUser = () => {
  if (isTelegramWebApp()) {
    return window.Telegram!.WebApp.initDataUnsafe.user
  }
  return null
}

export const getTelegramTheme = () => {
  if (isTelegramWebApp()) {
    return window.Telegram!.WebApp.themeParams
  }
  return {}
}

export const initTelegramWebApp = () => {
  if (isTelegramWebApp()) {
    window.Telegram!.WebApp.ready()
    window.Telegram!.WebApp.expand()
  }
}
