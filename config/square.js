// src/config/square.js
import { SquareClient, SquareEnvironment } from 'square';

// Create the client
const squareClient = new SquareClient({
  // In v43+, the key is 'token', not 'accessToken'
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

// Export APIs 
// Note: In v43+, these are accessible directly as properties of the client
export const paymentsApi = squareClient.payments;
export const refundsApi = squareClient.refunds;
export const locationsApi = squareClient.locations;
export const ordersApi = squareClient.orders;
export const customersApi = squareClient.customers;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptions;

export default squareClient;