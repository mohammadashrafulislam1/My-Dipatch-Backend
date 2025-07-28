import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["terms", "privacy"],
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

// Create default documents if they don't exist
policySchema.statics.initialize = async function() {
  const termsExists = await this.findOne({ type: "terms" });
  const privacyExists = await this.findOne({ type: "privacy" });
  
  if (!termsExists) {
    await this.create({
      type: "terms",
      title: "Terms & Conditions",
      content: "These are the current Terms & Conditions...",
    });
  }
  
  if (!privacyExists) {
    await this.create({
      type: "privacy",
      title: "Privacy Policy",
      content: "This is the current Privacy Policy...",
    });
  }
};

export const PolicyModel = mongoose.model("Policy", policySchema);