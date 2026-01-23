import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getAuthToken } from '../../utils/auth'

interface AuthState {
  token: string
}

const initialState: AuthState = {
  token: getAuthToken()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthToken: (state, action: PayloadAction<{ token: string }>) => {
      state.token = action.payload.token
    },
    clearAuthToken: (state) => {
      state.token = ''
    }
  }
})

export const { setAuthToken, clearAuthToken } = authSlice.actions
export default authSlice.reducer
