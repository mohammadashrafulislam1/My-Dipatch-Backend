import pkg from 'square'; // import the CommonJS package
const { Client } = pkg;  // no Environment object

const squareClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export const paymentsApi = squareClient.paymentsApi;
export const refundsApi = squareClient.refundsApi;
export const locationsApi = squareClient.locationsApi;
export const ordersApi = squareClient.ordersApi;
export const customersApi = squareClient.customersApi;
export const webhookSubscriptionsApi = squareClient.webhookSubscriptionsApi;

export default squareClient;
