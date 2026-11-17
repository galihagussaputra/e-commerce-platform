import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { adminAPI } from '../../services/api';

const initialState = {
  summary: null,
  trend: [],
  topProducts: [],
  recentTransactions: [],
  lowStock: [],
  inventory: null,
  movements: [],
  users: [],
  loading: false,
  error: null,
};

export const fetchDashboard = createAsyncThunk('admin/dashboard', async (range, { rejectWithValue }) => {
  try {
    const params = range || {};
    const [summary, trend, topProducts, recentTransactions, lowStock] = await Promise.all([
      adminAPI.summary(params),
      adminAPI.salesTrend(params),
      adminAPI.topProducts(params),
      adminAPI.recentTransactions({ limit: 8 }),
      adminAPI.lowStock(),
    ]);
    return { summary, trend, topProducts, recentTransactions, lowStock };
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchInventory = createAsyncThunk('admin/inventory', async (_, { rejectWithValue }) => {
  try {
    return await adminAPI.inventory();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchMovements = createAsyncThunk('admin/movements', async (params, { rejectWithValue }) => {
  try {
    const result = await adminAPI.movements(params);
    return result.items || result;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchUsers = createAsyncThunk('admin/users', async (_, { rejectWithValue }) => {
  try {
    const result = await adminAPI.users({ limit: 100 });
    return result.items || result;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const updateUserRole = createAsyncThunk('admin/updateRole', async ({ id, role }, { rejectWithValue }) => {
  try {
    return await adminAPI.updateRole(id, role);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const adjustStock = createAsyncThunk('admin/adjustStock', async ({ productId, delta, reason }, { rejectWithValue }) => {
  try {
    return await adminAPI.adjustStock(productId, { delta, reason });
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
      })
      .addCase(fetchInventory.fulfilled, (state, action) => { state.loading = false; state.inventory = action.payload; })
      .addCase(fetchMovements.fulfilled, (state, action) => { state.loading = false; state.movements = action.payload; })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.loading = false; state.users = action.payload; })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload?.id || action.payload?._id;
        state.users = state.users.map((user) =>
          (user.id || user._id) === id ? { ...user, ...action.payload } : user
        );
      })
      .addCase(adjustStock.fulfilled, (state) => { state.loading = false; })
      .addMatcher(
        (action) => action.type.startsWith('admin/') && action.type.endsWith('/pending'),
        (state) => { state.loading = true; state.error = null; }
      )
      .addMatcher(
        (action) => action.type.startsWith('admin/') && action.type.endsWith('/rejected'),
        (state, action) => { state.loading = false; state.error = action.payload; }
      );
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;
