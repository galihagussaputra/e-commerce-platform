import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const data = await authAPI.login(credentials);
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const data = await authAPI.register(payload);
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const loadUser = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    return await authAPI.me();
  } catch (error) {
    localStorage.removeItem('token');
    return rejectWithValue(error.message);
  }
});

export const addAddress = createAsyncThunk('auth/addAddress', async (payload, { rejectWithValue }) => {
  try {
    return await authAPI.addAddress(payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    return await authAPI.updateProfile(payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (payload, { rejectWithValue }) => {
  try {
    return await authAPI.changePassword(payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'ready';
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => { state.status = 'error'; state.error = action.payload; })
      .addCase(register.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'ready';
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(register.rejected, (state, action) => { state.status = 'error'; state.error = action.payload; })
      .addCase(loadUser.pending, (state) => { state.status = 'loading'; })
      .addCase(loadUser.fulfilled, (state, action) => { state.status = 'ready'; state.user = action.payload; })
      .addCase(loadUser.rejected, (state) => {
        state.status = 'idle';
        state.user = null;
        state.token = null;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        if (state.user) state.user.addresses = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
