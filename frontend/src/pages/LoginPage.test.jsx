import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import LoginPage from './LoginPage';
import { authAPI, cartAPI } from '../services/api';
import auth from '../features/auth/authSlice';
import cart, { setItems } from '../features/cart/cartSlice';
import catalog from '../features/catalog/catalogSlice';
import orders from '../features/orders/ordersSlice';
import admin from '../features/admin/adminSlice';

vi.mock('../services/api', () => ({
  authAPI: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  cartAPI: { sync: vi.fn() },
  productAPI: { list: vi.fn(), featured: vi.fn(), get: vi.fn(), categories: vi.fn() },
  checkoutAPI: { createSession: vi.fn() },
  orderAPI: { list: vi.fn(), get: vi.fn() },
  adminAPI: {},
}));

const makeStore = () => configureStore({ reducer: { auth, cart, catalog, orders, admin } });

const renderLogin = (store) => render(
  <Provider store={store}>
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<div>Account page</div>} />
      </Routes>
    </MemoryRouter>
  </Provider>
);

describe('LoginPage', () => {
  it('validates input then signs in and syncs the cart', async () => {
    const store = makeStore();
    store.dispatch(setItems([{ productId: 'p1', name: 'Lamp', price: 1000, quantity: 1, available: 5 }]));
    const user = userEvent.setup();
    renderLogin(store);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(authAPI.login).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'buyer@example.com');
    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), 'Demo12345');

    authAPI.login.mockResolvedValue({
      token: 'test-token',
      user: { id: '1', name: 'Buyer', email: 'buyer@example.com', role: 'user' },
    });
    cartAPI.sync.mockResolvedValue({ items: [], subtotal: 0, itemCount: 0 });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Account page')).toBeInTheDocument();
    expect(authAPI.login).toHaveBeenCalledWith({ email: 'buyer@example.com', password: 'Demo12345' });
    expect(cartAPI.sync).toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('test-token');
  });
});
