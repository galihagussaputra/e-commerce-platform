import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { checkoutAPI, orderAPI } from '../../services/api';

const initialState = { orders: [], current: null, total: 0, loading: false, error: null, checkoutUrl: null };

export const fetchOrders = createAsyncThunk('orders/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const result = await orderAPI.list(params);
    return { items: result.items || result, meta: result.meta || { total: (result.items || result).length } };
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchOrder = createAsyncThunk('orders/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await orderAPI.get(id);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const createCheckout = createAsyncThunk('orders/checkout', async (payload, { rejectWithValue }) => {
  try {
    return await checkoutAPI.createSession(payload);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const cancelOrder = createAsyncThunk('orders/cancel', async ({ id, reason }, { rejectWithValue }) => {
  try {
    return await orderAPI.cancel(id, reason);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const updateOrderStatus = createAsyncThunk('orders/updateStatus', async ({ id, status, note }, { rejectWithValue }) => {
  try {
    return await orderAPI.updateStatus(id, status, note);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCheckoutUrl(state) { state.checkoutUrl = null; state.error = null; },
    clearOrderError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.items;
        state.total = action.payload.meta.total || 0;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(createCheckout.fulfilled, (state, action) => {
        state.loading = false;
        state.checkoutUrl = action.payload.url;
      })
      .addMatcher(
        (action) => action.type.startsWith('orders/') && action.type.endsWith('/pending'),
        (state) => { state.loading = true; state.error = null; }
      )
      .addMatcher(
        (action) => ['orders/cancel/fulfilled', 'orders/updateStatus/fulfilled'].includes(action.type),
        (state, action) => {
          state.loading = false;
          state.current = action.payload;
          state.orders = state.orders.map((order) => (order._id === action.payload._id ? action.payload : order));
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('orders/') && action.type.endsWith('/rejected'),
        (state, action) => { state.loading = false; state.error = action.payload; }
      );
  },
});

export const { clearCheckoutUrl, clearOrderError } = ordersSlice.actions;
export default ordersSlice.reducer;
