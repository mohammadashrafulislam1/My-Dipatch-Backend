// src/config/square.js
import { Client, Environment } from 'square';

// Create the client
const squareClient = new Client({
  // Using the Environment enum is safer and cleaner
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Export APIs
export const paymentsApi = squareClient.paymentsApi;
export const refundsApi = squareClient.refundsApi;
export const locationsApi = squareClient.locationsApi;
export const ordersApi = squareClient.ordersApi;
export const customersApi = squareClient.customersApi;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptionsApi;

export default squareClient;