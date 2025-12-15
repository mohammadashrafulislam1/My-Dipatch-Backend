// config/square.js
import { Client, Environment } from 'square';

// Initialize Square client
const squareClient = new Client({
  environment: process.env.NODE_ENV === 'production' 
    ? Environment.Production 
    : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Export individual APIs for easier use
export const { 
  paymentsApi, 
  locationsApi, 
  ordersApi, 
  customersApi,
  refundsApi,
  webhookSubscriptionsApi 
} = squareClient;

// Also export the full client if needed
export default squareClient;