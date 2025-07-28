import express from "express";
import { getTransactionHistory, getWalletDashboard } from "../../Controllers/AdminController/WalletController";

export const walletRouter = express.Router();

// Get wallet dashboard data.
walletRouter.get("/dashboard", getWalletDashboard);

// Get transaction history with filters
walletRouter.get("/transactions", getTransactionHistory);
