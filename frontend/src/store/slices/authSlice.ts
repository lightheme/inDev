import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getAuthToken } from '../../utils/auth'

interface AuthState {
  authToken: string
}

const initialState: AuthState = {
  authToken: getAuthToken()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthToken: (state, action: PayloadAction<{ token: string }>) => {
      state.authToken = action.payload.token
    }
  }
})

export const { setAuthToken } = authSlice.actions
export default authSlice.reducer
