process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-please-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.CLIENT_URL = 'http://localhost:5173';

const os = require('node:os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri(), { runtimeAdapters: { os } });
});

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
});
