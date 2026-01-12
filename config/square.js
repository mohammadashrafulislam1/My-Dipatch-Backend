import 'dotenv/config';
import { SquareClient, SquareEnvironment } from 'square';

const token = process.env.SQUARE_ACCESS_TOKEN;
const environment =
  process.env.SQUARE_ENV === 'sandbox'
    ? SquareEnvironment.Sandbox
    : SquareEnvironment.Production;

const squareClient = new SquareClient({
  token: token,
  environment,
});

async function test() {
  try {
    const response = await squareClient.locations.list(); // ⚡ correct for your SDK
    console.log("Sandbox locations:", response);
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
