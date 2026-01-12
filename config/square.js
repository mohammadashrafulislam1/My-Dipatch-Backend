// src/config/square.ts
import 'dotenv/config'; 
import { SquareClient, SquareEnvironment } from 'square';

// Use SQUARE_ENV instead of checking SQUARE_ENVIRONMENT
const token = process.env.SQUARE_ACCESS_TOKEN;
const environment = process.env.SQUARE_ENV === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production;

// This will help you see EXACTLY what is being sent to Square (safe logging)
if (!token) {
  console.error("❌ SQUARE_ACCESS_TOKEN is UNDEFINED. Check your Render Environment Variables.");
} else {
  console.log(`✅ Square Token detected. Starts with: ${token.substring(0, 12)}...`);
  console.log(`✅ Environment set to: ${process.env.SQUARE_ENV}`);
}

const squareClient = new SquareClient({
  accessToken: token,
  environment: environment,  // Use the variable here
});
async function test() {
  try {
    const locations = await squareClient.locations.listLocations();
    console.log("Locations:", locations.result.locations);
  } catch (e) {
    console.error("Auth error:", e);
  }
}

test();
export const paymentsApi = squareClient.payments;
export const refundsApi = squareClient.refunds;
export const locationsApi = squareClient.locations;
export const ordersApi = squareClient.orders;
export const customersApi = squareClient.customers;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptions;

export default squareClient;