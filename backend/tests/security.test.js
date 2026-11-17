const request = require('supertest');

jest.mock('../src/config/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: { sessions: { create: jest.fn(async () => ({})) } },
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn(async () => ({})) },
  })),
}));

const { createApp } = require('../src/app');
const Product = require('../src/models/Product');
const { createCategory, createProduct, registerCustomer } = require('./helpers/factories');

const app = createApp();

describe('security regressions', () => {
  it('invalidates the current token on server-side logout', async () => {
    const { token } = await registerCustomer(app, 'logout@example.com');

    await request(app).post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const response = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body.error.code).toBe('SESSION_INVALID');
  });

  it('invalidates existing tokens after a password change', async () => {
    const { token } = await registerCustomer(app, 'password-change@example.com');

    await request(app).put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Demo12345', newPassword: 'NewDemo12345' })
      .expect(200);

    await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    await request(app).post('/api/auth/login')
      .send({ email: 'password-change@example.com', password: 'Demo12345' })
      .expect(401);

    await request(app).post('/api/auth/login')
      .send({ email: 'password-change@example.com', password: 'NewDemo12345' })
      .expect(200);
  });

  it('does not expose draft products through the public status=all query', async () => {
    const category = await createCategory('Security', 'security');
    await createProduct(category, {
      name: 'Draft Product',
      slug: 'draft-product',
      status: 'draft',
    });

    const response = await request(app).get('/api/products?status=all').expect(200);
    expect(response.body.data.some((product) => product.slug === 'draft-product')).toBe(false);
    expect(await Product.countDocuments()).toBe(1);
  });
});
