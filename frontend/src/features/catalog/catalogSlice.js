import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { productAPI } from '../../services/api';

const initialState = {
  products: [],
  featured: [],
  categories: [],
  current: null,
  total: 0,
  loading: false,
  error: null,
  filters: { q: '', category: '', minPrice: '', maxPrice: '', sort: 'newest', page: 1 },
};

export const fetchProducts = createAsyncThunk('catalog/fetchAll', async (_, { getState, rejectWithValue }) => {
  try {
    const { filters } = getState().catalog;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined));
    const result = await productAPI.list(params);
    return { items: result.items || result, meta: result.meta || { total: (result.items || result).length } };
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchProduct = createAsyncThunk('catalog/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await productAPI.get(id);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchFeatured = createAsyncThunk('catalog/featured', async (_, { rejectWithValue }) => {
  try {
    return await productAPI.featured();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchCategories = createAsyncThunk('catalog/categories', async (_, { rejectWithValue }) => {
  try {
    return await productAPI.categories();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload, page: action.payload.page ?? 1 };
    },
    setPage(state, action) {
      state.filters.page = action.payload;
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.items;
        state.total = action.payload.meta.total || 0;
      })
      .addCase(fetchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchProduct.pending, (state) => { state.loading = true; state.error = null; state.current = null; })
      .addCase(fetchProduct.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(fetchProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchFeatured.fulfilled, (state, action) => { state.featured = action.payload; })
      .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload; });
  },
});

export const { setFilters, setPage, resetFilters } = catalogSlice.actions;
export default catalogSlice.reducer;
