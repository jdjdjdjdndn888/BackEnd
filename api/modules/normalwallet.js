const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    owner: { type: Number, required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    wagered: { type: Number, default: 0, min: 0 },
    won: { type: Number, default: 0, min: 0 },
    lost: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "normalwallets" }
);

const operationSchema = new mongoose.Schema(
  {
    operationId: { type: String, required: true, unique: true, index: true },
    owner: { type: Number, required: true, index: true },
    type: { type: String, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: "normalwalletoperations" }
);

module.exports = {
  Wallet: mongoose.model("NormalWallet", walletSchema),
  Operation: mongoose.model("NormalWalletOperation", operationSchema),
};