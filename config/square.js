// src/config/square.js
import pkg from 'square';

// Try every possible location the Client constructor could be hiding
const Client = pkg.Client || (typeof pkg === 'function' ? pkg : pkg.default);

if (!Client) {
  console.error('Square Import Debug:', pkg); // This will show us exactly what is inside pkg if it fails
  throw new Error('Square Client could not be loaded.');
}

const squareClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Export APIs safely
export const paymentsApi = squareClient.paymentsApi;
export const refundsApi = squareClient.refundsApi;
export const locationsApi = squareClient.locationsApi;
export const ordersApi = squareClient.ordersApi;
export const customersApi = squareClient.customersApi;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptionsApi;

export default squareClient;