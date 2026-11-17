import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cartAPI } from '../../services/api';

const STORAGE_KEY = 'katalog.cart';

const loadLocal = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const mapCart = (data) => (data?.items || []).map((item) => ({
  productId: item.product?._id || item.productId,
  slug: item.product?.slug || item.slug,
  name: item.product?.name || item.name,
  image: item.product?.images?.[0] || item.image || '',
  price: item.unitPrice ?? item.product?.price ?? 0,
  quantity: item.quantity,
  available: item.available ?? item.product?.available ?? 0,
}));

const persist = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

const initialState = { items: loadLocal(), loading: false, error: null };

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { getState, rejectWithValue }) => {
  if (!getState().auth.token) return getState().cart.items;
  try {
    return mapCart(await cartAPI.get());
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const addToCart = createAsyncThunk('cart/add', async (payload, { getState, dispatch, rejectWithValue }) => {
  const { auth, cart } = getState();
  const { productId, quantity = 1, product } = payload;
  const cap = product?.available ?? 99;
  if (!productId) return rejectWithValue('Invalid product');
  if (auth.token) {
    try {
      return mapCart(await cartAPI.add(productId, quantity));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
  const items = [...cart.items];
  const index = items.findIndex((item) => item.productId === productId);
  if (index >= 0) {
    const next = Math.min(items[index].quantity + quantity, cap);
    if (next === items[index].quantity) return rejectWithValue('Not enough stock available');
    items[index] = { ...items[index], quantity: next, available: cap };
  } else {
    items.push({
      productId,
      slug: product?.slug,
      name: product?.name || 'Product',
      image: product?.images?.[0] || '',
      price: product?.price || 0,
      quantity: Math.min(quantity, cap),
      available: cap,
    });
  }
  persist(items);
  dispatch(setItems(items));
  return items;
});

export const updateCartItem = createAsyncThunk('cart/update', async ({ productId, quantity }, { getState, dispatch, rejectWithValue }) => {
  const { auth, cart } = getState();
  if (auth.token) {
    try {
      if (quantity <= 0) return mapCart(await cartAPI.remove(productId));
      return mapCart(await cartAPI.update(productId, quantity));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
  let items = cart.items.map((item) =>
    item.productId === productId ? { ...item, quantity: Math.min(quantity, item.available || 99) } : item
  ).filter((item) => item.quantity > 0);
  persist(items);
  dispatch(setItems(items));
  return items;
});

export const removeFromCart = createAsyncThunk('cart/remove', async (productId, { getState, dispatch, rejectWithValue }) => {
  const { auth, cart } = getState();
  if (auth.token) {
    try {
      return mapCart(await cartAPI.remove(productId));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
  const items = cart.items.filter((item) => item.productId !== productId);
  persist(items);
  dispatch(setItems(items));
  return items;
});

export const syncCart = createAsyncThunk('cart/sync', async (_, { getState, rejectWithValue }) => {
  const { auth, cart } = getState();
  if (!auth.token || !cart.items.length) return cart.items;
  try {
    return mapCart(await cartAPI.sync(cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))));
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const clearCart = createAsyncThunk('cart/clear', async (_, { getState, dispatch, rejectWithValue }) => {
  const { auth } = getState();
  if (auth.token) {
    try {
      return mapCart(await cartAPI.clear());
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
  persist([]);
  dispatch(setItems([]));
  return [];
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setItems(state, action) {
      state.items = action.payload;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type.startsWith('cart/') && action.type.endsWith('/pending'),
        (state) => { state.loading = true; state.error = null; }
      )
      .addMatcher(
        (action) => action.type.startsWith('cart/') && action.type.endsWith('/fulfilled'),
        (state, action) => {
          state.loading = false;
          if (Array.isArray(action.payload)) {
            state.items = action.payload;
            persist(action.payload);
          }
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('cart/') && action.type.endsWith('/rejected'),
        (state, action) => { state.loading = false; state.error = action.payload; }
      );
  },
});

export const { setItems, clearError } = cartSlice.actions;
export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
export default cartSlice.reducer;
