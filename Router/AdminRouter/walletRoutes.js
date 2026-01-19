import express from "express";
import { getTransactionHistory, getWalletDashboard, getWithdrawalRequests } from "../../Controllers/AdminController/WalletController.js";

export const walletRouterr = express.Router();

// Get wallet dashboard data.
walletRouterr.get("/dashboard", getWalletDashboard);

// Get transaction history with filters
walletRouterr.get("/transactions", getTransactionHistory);
walletRouterr.get("/withdrawal-requests", getWithdrawalRequests);
