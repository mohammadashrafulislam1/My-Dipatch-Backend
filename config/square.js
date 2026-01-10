// src/config/square.ts
import { SquareClient, SquareEnvironment } from 'square';
import 'dotenv/config'; // Ensure this is at the very top

const token = process.env.SQUARE_ACCESS_TOKEN;

// Log the first few characters to verify it's the right type of token
if (token) {
  console.log(`Square Token Type: ${token.startsWith('sandbox') ? 'SANDBOX' : 'PRODUCTION'}`);
} else {
  console.error("FATAL: SQUARE_ACCESS_TOKEN is missing from environment variables!");
}

const squareClient = new SquareClient({
  accessToken: token,
  environment: SquareEnvironment.Sandbox, 
});

export const paymentsApi = squareClient.payments;
export const refundsApi = squareClient.refunds;    // NOT refundsApi
export const locationsApi = squareClient.locations;
export const ordersApi = squareClient.orders;
export const customersApi = squareClient.customers;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptions;

export default squareClient;
