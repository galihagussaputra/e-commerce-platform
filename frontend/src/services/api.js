import axios from 'axios';

let sessionExpiredHandler = () => {};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      sessionExpiredHandler();
    }
    const message = error.response?.data?.error?.message || error.message || 'Request failed';
    const normalized = new Error(message);
    normalized.code = error.response?.data?.error?.code;
    normalized.status = error.response?.status;
    normalized.details = error.response?.data?.error?.details;
    return Promise.reject(normalized);
  }
);

const unwrap = (response) => response.data?.data ?? response.data;

export const authAPI = {
  register: (payload) => client.post('/auth/register', payload).then(unwrap),
  login: (payload) => client.post('/auth/login', payload).then(unwrap),
  logout: () => client.post('/auth/logout').then(unwrap),
  me: () => client.get('/auth/me').then(unwrap),
  updateProfile: (payload) => client.put('/auth/profile', payload).then(unwrap),
  changePassword: (payload) => client.put('/auth/password', payload).then(unwrap),
  addAddress: (payload) => client.post('/auth/addresses', payload).then(unwrap),
  updateAddress: (id, payload) => client.put(`/auth/addresses/${id}`, payload).then(unwrap),
  removeAddress: (id) => client.delete(`/auth/addresses/${id}`).then(unwrap),
};

export const productAPI = {
  list: (params) => client.get('/products', { params }).then(unwrap),
  featured: () => client.get('/products/featured').then(unwrap),
  get: (id) => client.get(`/products/${id}`).then(unwrap),
  categories: () => client.get('/products/categories').then(unwrap),
  create: (payload) => client.post('/products', payload).then(unwrap),
  update: (id, payload) => client.put(`/products/${id}`, payload).then(unwrap),
  remove: (id) => client.delete(`/products/${id}`).then(unwrap),
};

export const cartAPI = {
  get: () => client.get('/cart').then(unwrap),
  add: (productId, quantity = 1) => client.post(`/cart/items/${productId}`, { quantity }).then(unwrap),
  update: (productId, quantity) => client.put(`/cart/items/${productId}`, { quantity }).then(unwrap),
  remove: (productId) => client.delete(`/cart/items/${productId}`).then(unwrap),
  clear: () => client.delete('/cart').then(unwrap),
  sync: (items) => client.post('/cart/sync', { items }).then(unwrap),
};

export const checkoutAPI = {
  createSession: (payload) => client.post('/checkout/session', payload).then(unwrap),
};

export const orderAPI = {
  list: (params) => client.get('/orders', { params }).then(unwrap),
  get: (id) => client.get(`/orders/${id}`).then(unwrap),
  cancel: (id, reason) => client.post(`/orders/${id}/cancel`, { reason }).then(unwrap),
  updateStatus: (id, status, note) => client.patch(`/orders/${id}/status`, { status, note }).then(unwrap),
};

export const adminAPI = {
  users: (params) => client.get('/auth/users', { params }).then(unwrap),
  updateRole: (id, role) => client.put(`/auth/users/${id}/role`, { role }).then(unwrap),
  categories: () => client.get('/products/categories').then(unwrap),
  createCategory: (payload) => client.post('/products/categories', payload).then(unwrap),
  summary: (params) => client.get('/admin/analytics/summary', { params }).then(unwrap),
  salesTrend: (params) => client.get('/admin/analytics/sales-trend', { params }).then(unwrap),
  topProducts: (params) => client.get('/admin/analytics/top-products', { params }).then(unwrap),
  recentTransactions: (params) => client.get('/admin/analytics/recent-transactions', { params }).then(unwrap),
  inventory: () => client.get('/admin/analytics/inventory').then(unwrap),
  lowStock: () => client.get('/admin/inventory/low-stock').then(unwrap),
  movements: (params) => client.get('/admin/inventory/movements', { params }).then(unwrap),
  adjustStock: (productId, payload) => client.post(`/admin/inventory/adjust/${productId}`, payload).then(unwrap),
};

export default client;
