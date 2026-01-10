// src/config/square.ts
import 'dotenv/config'; 
import { SquareClient, SquareEnvironment } from 'square';

const token = process.env.SQUARE_ACCESS_TOKEN;

// This will help you see EXACTLY what is being sent to Square (safe logging)
if (!token) {
  console.error("❌ SQUARE_ACCESS_TOKEN is UNDEFINED. Check your Render Environment Variables.");
} else {
  console.log(`✅ Square Token detected. Starts with: ${token.substring(0, 12)}...`);
  console.log(`✅ Environment set to: SANDBOX`);
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
