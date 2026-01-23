import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getDevAuthToken } from '../../utils/auth'
import { getTelegramInitData, getTelegramUser, getTelegramTheme, isTelegramWebApp } from '../../utils/telegram'

interface TelegramState {
  initData: string
  isInTelegram: boolean
  user: {
    id: number
    first_name: string
    last_name?: string
    username?: string
  } | null
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  devMode: boolean
  devToken: string
}

const initialState: TelegramState = {
  initData: getTelegramInitData(),
  isInTelegram: isTelegramWebApp(),
  user: getTelegramUser(),
  themeParams: getTelegramTheme(),
  devMode: !isTelegramWebApp(),
  devToken: getDevAuthToken()
}

const telegramSlice = createSlice({
  name: 'telegram',
  initialState,
  reducers: {
    setDevAuthToken: (state, action: PayloadAction<{ token: string }>) => {
      state.devMode = true
      state.devToken = action.payload.token
    },
    updateThemeParams: (state, action: PayloadAction<TelegramState['themeParams']>) => {
      state.themeParams = action.payload
    }
  }
})

export const { setDevAuthToken, updateThemeParams } = telegramSlice.actions
export default telegramSlice.reducer
