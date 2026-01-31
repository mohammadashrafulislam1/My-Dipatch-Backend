// routes/walletRoutes.js
import express from "express";
import { addMoney, getTransactions, getWallet, saveUserCard, withdrawMoney } from "../../Controllers/CustomerController/WalletController.js";

export const walletRouter = express.Router();
walletRouter.post("/save-card", saveUserCard);
walletRouter.post("/add", addMoney);
walletRouter.post("/withdraw", withdrawMoney);
walletRouter.get("/:userId", getWallet);
walletRouter.get("/transactions/:userId", getTransactions);

