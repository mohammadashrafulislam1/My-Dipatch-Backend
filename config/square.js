import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// IMPORTANT: SquareClient (not Client)
const { SquareClient } = require('square');

const squareClient = new SquareClient({
  environment:
    process.env.NODE_ENV === 'production'
      ? 'production'
      : 'sandbox',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export const {
  paymentsApi,
  locationsApi,
  ordersApi,
  customersApi,
  refundsApi,
  webhookSubscriptionsApi,
} = squareClient;

export default squareClient;
