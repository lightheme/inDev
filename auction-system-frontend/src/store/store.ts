import { configureStore } from '@reduxjs/toolkit'
import { apiSlice } from './api/apiSlice'
import telegramReducer from './slices/telegramSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    telegram: telegramReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
