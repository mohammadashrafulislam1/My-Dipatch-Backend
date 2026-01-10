// src/config/square.ts
import {  Environment, SquareClient } from 'square';

const squareClient = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.NODE_ENV === 'production'
      ? Environment.Production
      : Environment.Sandbox,
});

// ✅ Access APIs using correct properties
export const paymentsApi = squareClient.payments;  // NOT paymentsApi
export const refundsApi = squareClient.refunds;    // NOT refundsApi
export const locationsApi = squareClient.locations;
export const ordersApi = squareClient.orders;
export const customersApi = squareClient.customers;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptions;

export default squareClient;
