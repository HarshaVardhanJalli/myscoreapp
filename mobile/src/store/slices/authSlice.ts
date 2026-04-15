import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI, storeTokens, clearTokens } from '../../services/api';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; username: string; name: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.register(data);
      await storeTokens(res.data.accessToken, res.data.refreshToken);
      const meRes = await authAPI.getMe();
      return meRes.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Registration failed');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login(data);
      await storeTokens(res.data.accessToken, res.data.refreshToken);
      const meRes = await authAPI.getMe();
      return meRes.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Login failed');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const res = await authAPI.googleAuth(idToken);
      await storeTokens(res.data.accessToken, res.data.refreshToken);
      const meRes = await authAPI.getMe();
      return meRes.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Google login failed');
    }
  }
);

export const loadUser = createAsyncThunk('auth/loadUser', async (_, { rejectWithValue }) => {
  try {
    const res = await authAPI.getMe();
    return res.data;
  } catch {
    return rejectWithValue(null);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await clearTokens();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    const pendingAction = (state: AuthState) => { state.isLoading = true; state.error = null; };
    const rejectedAction = (state: AuthState, action: any) => {
      state.isLoading = false;
      state.error = action.payload as string;
    };
    const fulfilledAuth = (state: AuthState, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    };

    builder
      .addCase(register.pending, pendingAction)
      .addCase(register.fulfilled, fulfilledAuth)
      .addCase(register.rejected, rejectedAction)
      .addCase(login.pending, pendingAction)
      .addCase(login.fulfilled, fulfilledAuth)
      .addCase(login.rejected, rejectedAction)
      .addCase(googleLogin.pending, pendingAction)
      .addCase(googleLogin.fulfilled, fulfilledAuth)
      .addCase(googleLogin.rejected, rejectedAction)
      .addCase(loadUser.pending, pendingAction)
      .addCase(loadUser.fulfilled, fulfilledAuth)
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
