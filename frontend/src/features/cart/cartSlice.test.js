import { configureStore } from '@reduxjs/toolkit';
import auth from '../auth/authSlice';
import cart, {
  addToCart,
  removeFromCart,
  selectCartCount,
  updateCartItem,
} from './cartSlice';

const makeStore = () => configureStore({ reducer: { auth, cart } });
const product = { slug: 'desk-lamp', name: 'Desk Lamp', price: 250000, images: [], available: 5 };

describe('guest cart', () => {
  it('adds, updates and removes items without a token', async () => {
    const store = makeStore();

    await store.dispatch(addToCart({ productId: 'p1', quantity: 2, product }));
    expect(selectCartCount(store.getState())).toBe(2);
    expect(JSON.parse(localStorage.getItem('katalog.cart'))[0].quantity).toBe(2);

    await store.dispatch(updateCartItem({ productId: 'p1', quantity: 4 }));
    expect(selectCartCount(store.getState())).toBe(4);

    await store.dispatch(updateCartItem({ productId: 'p1', quantity: 99 }));
    expect(selectCartCount(store.getState())).toBe(5);

    await store.dispatch(removeFromCart('p1'));
    expect(selectCartCount(store.getState())).toBe(0);
    expect(JSON.parse(localStorage.getItem('katalog.cart'))).toEqual([]);
  });
});
