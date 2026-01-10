// src/config/square.ts
import { SquareClient, SquareEnvironment } from 'square';

const squareClient = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  /*environment:
    process.env.NODE_ENV === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,*/
   environment: Environment.Sandbox,
});
console.log("Square token loaded:", !!process.env.SQUARE_ACCESS_TOKEN);
console.log("Square env:", process.env.SQUARE_ENV);

// ✅ Access APIs using correct properties
export const paymentsApi = squareClient.payments;  // NOT paymentsApi
export const refundsApi = squareClient.refunds;    // NOT refundsApi
export const locationsApi = squareClient.locations;
export const ordersApi = squareClient.orders;
export const customersApi = squareClient.customers;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptions;

export default squareClient;
