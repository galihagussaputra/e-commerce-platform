const express = require('express');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');

const createApp = () => {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(require('helmet')());
  app.use(require('cors')({ origin: config.corsOrigins, credentials: false }));

  app.use('/api/payments', require('./routes/payment.routes'));

  app.use(express.json({ limit: '1mb' }));
  app.use(apiLimiter);

  app.get('/api/health', (_req, res) =>
    res.json({ success: true, data: { status: 'ok', service: 'backend', time: new Date().toISOString() } }));

  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/products', require('./routes/product.routes'));
  app.use('/api/cart', require('./routes/cart.routes'));
  app.use('/api/checkout', require('./routes/checkout.routes'));
  app.use('/api/orders', require('./routes/order.routes'));
  app.use('/api/admin', require('./routes/admin.routes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
