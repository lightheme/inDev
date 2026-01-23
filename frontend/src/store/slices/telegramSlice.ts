import { createSlice, PayloadAction } from '@reduxjs/toolkit'
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
}

const initialState: TelegramState = {
  initData: getTelegramInitData(),
  isInTelegram: isTelegramWebApp(),
  user: getTelegramUser(),
  themeParams: getTelegramTheme(),
  devMode: !isTelegramWebApp()
}

const telegramSlice = createSlice({
  name: 'telegram',
  initialState,
  reducers: {
    setDevMode: (state, action: PayloadAction<{ initData: string; user: any }>) => {
      state.devMode = true
      state.initData = action.payload.initData
      state.user = action.payload.user
    },
    updateThemeParams: (state, action: PayloadAction<TelegramState['themeParams']>) => {
      state.themeParams = action.payload
    }
  }
})

export const { setDevMode, updateThemeParams } = telegramSlice.actions
export default telegramSlice.reducer
