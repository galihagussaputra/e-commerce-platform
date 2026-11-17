const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

describe('authentication API', () => {
  it('registers, logs in and never exposes the password', async () => {
    const registered = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test Customer', email: 'Buyer@Example.com', password: 'Demo12345' })
      .expect(201);

    expect(registered.body.data.user.email).toBe('buyer@example.com');
    expect(registered.body.data.user.password).toBeUndefined();
    expect(registered.body.data.token).toBeTruthy();

    const loggedIn = await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@example.com', password: 'Demo12345' })
      .expect(200);
    expect(loggedIn.body.data.token).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loggedIn.body.data.token}`)
      .expect(200);
    expect(me.body.data.name).toBe('Test Customer');
    expect(me.body.data.password).toBeUndefined();
  });

  it('rejects bad credentials and missing tokens', async () => {
    await User.create({ name: 'Buyer', email: 'buyer@example.com', password: 'Demo12345' });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'buyer@example.com', password: 'WrongPassword' })
      .expect(401);

    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('blocks non-admins from admin-only routes', async () => {
    const user = await User.create({ name: 'Buyer', email: 'buyer@example.com', password: 'Demo12345' });
    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'Demo12345', role: 'admin' });

    const userLogin = await request(app).post('/api/auth/login')
      .send({ email: user.email, password: 'Demo12345' }).expect(200);
    const adminLogin = await request(app).post('/api/auth/login')
      .send({ email: admin.email, password: 'Demo12345' }).expect(200);

    await request(app).get('/api/auth/users')
      .set('Authorization', `Bearer ${userLogin.body.data.token}`).expect(403);

    const response = await request(app).get('/api/auth/users')
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`).expect(200);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.items[0].id).toBeTruthy();
  });
});
