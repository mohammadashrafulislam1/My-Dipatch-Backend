import { SquareClient, Environment } from 'square';

const squareClient = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // must be 'accessToken', not 'token'
  environment: process.env.SQUARE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
});

// Export the API objects properly
export const paymentsApi = squareClient.paymentsApi;   // <--- note the 'Api' suffix
export const refundsApi = squareClient.refundsApi;
export const locationsApi = squareClient.locationsApi;
export const ordersApi = squareClient.ordersApi;
export const customersApi = squareClient.customersApi;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptionsApi;

export default squareClient;
