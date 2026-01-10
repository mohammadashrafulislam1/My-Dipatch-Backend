// src/config/square.js
import pkg from 'square';

// Handle different import behaviors between local and production
const Client = pkg.Client || pkg.default?.Client;

if (!Client) {
  throw new Error('Square Client could not be loaded. Check your SDK version.');
}

const squareClient = new Client({
  // Using direct strings bypasses the missing 'Environment' object issue
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Export APIs
export const { 
  paymentsApi, 
  refundsApi, 
  locationsApi, 
  ordersApi, 
  customersApi, 
  webhookSubscriptionsApi 
} = squareClient;

export default squareClient;