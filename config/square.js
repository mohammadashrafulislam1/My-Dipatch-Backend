// src/config/square.js
import Square from 'square'; // default import of the SDK

// Create the client
const squareClient = new Square.Client({
  environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Export the APIs
export const paymentsApi = squareClient.paymentsApi;
export const refundsApi = squareClient.refundsApi;
export const locationsApi = squareClient.locationsApi;
export const ordersApi = squareClient.ordersApi;
export const customersApi = squareClient.customersApi;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptionsApi;

export default squareClient;
