require('dotenv').config();
const config = require('./src/config');
const { createApp } = require('./src/app');
const { connectDatabase } = require('./src/config/database');
const { expireStaleReservations, startReservationCleanup } = require('./src/services/order.service');

const start = async () => {
  await connectDatabase();
  await expireStaleReservations();
  const app = createApp();
  startReservationCleanup();
  app.listen(config.port, () => {
    console.log(`Backend listening on http://localhost:${config.port}`);
    console.log(`Stripe configured: ${config.isStripeConfigured ? 'yes' : 'no (payments disabled)'}`);
  });
};

start().catch((error) => {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
});
