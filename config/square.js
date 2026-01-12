import 'dotenv/config';
import { SquareClient, SquareEnvironment } from 'square';

const token = process.env.SQUARE_ACCESS_TOKEN;
const environment =
  process.env.SQUARE_ENV === 'sandbox'
    ? SquareEnvironment.Sandbox
    : SquareEnvironment.Production;

if (!token) {
  console.error("❌ SQUARE_ACCESS_TOKEN is UNDEFINED. Check your environment variables.");
} else {
  console.log(`✅ Square Token detected. Starts with: ${token.substring(0, 12)}...`);
  console.log(`✅ Environment set to: ${process.env.SQUARE_ENV}`);
}

const squareClient = new SquareClient({
  accessToken: token,      // ⚠ must be accessToken
  environment,
});

async function test() {
  try {
    const response = await squareClient.locations.listLocations(); // ⚠ correct method
    console.log("Sandbox locations:", response.result.locations);
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
// 
export default squareClient;
