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
// ... rest of your exports