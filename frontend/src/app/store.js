import { combineReducers, configureStore } from '@reduxjs/toolkit';
import auth, { sessionExpired } from '../features/auth/authSlice';
import { setSessionExpiredHandler } from '../services/api';
import cart from '../features/cart/cartSlice';
import catalog from '../features/catalog/catalogSlice';
import orders from '../features/orders/ordersSlice';
import admin from '../features/admin/adminSlice';

const appReducer = combineReducers({ auth, cart, catalog, orders, admin });

const rootReducer = (state, action) => {
  if (action.type === sessionExpired.type) return appReducer(undefined, action);
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: ['auth/loadUser/fulfilled'] } }),
});

setSessionExpiredHandler(() => store.dispatch(sessionExpired()));
