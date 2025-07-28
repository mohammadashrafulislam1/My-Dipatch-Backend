import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema({
  pricePerKm: {
    type: Number,
    required: true,
    min: 0.1,
    max: 10,
    default: 1.5
  },
  adminCommission: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
    default: 20
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

// Create a singleton instance
pricingSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ pricePerKm: 1.5, adminCommission: 20 });
  }
  return settings;
};

export const PricingModel = mongoose.model("Pricing", pricingSchema);