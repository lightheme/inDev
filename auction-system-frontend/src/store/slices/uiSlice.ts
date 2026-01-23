import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface UiState {
  toasts: Toast[]
}

const initialState: UiState = {
  toasts: []
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      state.toasts.push({
        id,
        ...action.payload,
        duration: action.payload.duration || 3000
      })
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload)
    },
    clearToasts: (state) => {
      state.toasts = []
    }
  }
})

export const { addToast, removeToast, clearToasts } = uiSlice.actions
export default uiSlice.reducer
