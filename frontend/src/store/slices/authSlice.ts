import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getDevAuthToken } from '../../utils/auth'

interface AuthState {
  devToken: string
}

const initialState: AuthState = {
  devToken: getDevAuthToken()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setDevAuthToken: (state, action: PayloadAction<{ token: string }>) => {
      state.devToken = action.payload.token
    }
  }
})

export const { setDevAuthToken } = authSlice.actions
export default authSlice.reducer
