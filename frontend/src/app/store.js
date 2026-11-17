import { configureStore } from '@reduxjs/toolkit';
import auth from '../features/auth/authSlice';
import cart from '../features/cart/cartSlice';
import catalog from '../features/catalog/catalogSlice';
import orders from '../features/orders/ordersSlice';
import admin from '../features/admin/adminSlice';

export const store = configureStore({
  reducer: { auth, cart, catalog, orders, admin },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: ['auth/loadUser/fulfilled'] } }),
});
