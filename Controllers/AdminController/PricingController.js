import { PricingModel } from "../../Model/AdminModel/Pricing";


// Get current pricing settings
export const getPricingSettings = async (req, res) => {
  try {
    const settings = await PricingModel.getSettings();
    res.json({
      pricePerKm: settings.pricePerKm,
      adminCommission: settings.adminCommission,
      commissionPerDollar: (settings.adminCommission / 100).toFixed(2)
    });
  } catch (err) {
    console.error("Error fetching pricing settings:", err);
    res.status(500).json({ message: "Failed to get pricing settings" });
  }
};

// Update pricing settings
export const updatePricingSettings = async (req, res) => {
  const { pricePerKm, adminCommission } = req.body;
  const adminId = req.user.id; // Assuming admin is authenticated

  try {
    // Validate inputs
    if (pricePerKm === undefined || adminCommission === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (isNaN(pricePerKm) {
      return res.status(400).json({ message: "Price per km must be a number" });
    }

    if (isNaN(adminCommission)) {
      return res.status(400).json({ message: "Commission must be a number" });
    }

    const settings = await PricingModel.getSettings();
    settings.pricePerKm = parseFloat(pricePerKm);
    settings.adminCommission = parseFloat(adminCommission);
    settings.updatedBy = adminId;

    await settings.save();

    res.json({
      message: "Pricing updated successfully",
      pricePerKm: settings.pricePerKm,
      adminCommission: settings.adminCommission,
      commissionPerDollar: (settings.adminCommission / 100).toFixed(2)
    });
  } catch (err) {
    console.error("Error updating pricing:", err);
    res.status(500).json({ message: "Failed to update pricing settings" });
  }
};

// Get pricing history (optional)
export const getPricingHistory = async (req, res) => {
  try {
    const history = await PricingModel.find()
      .sort({ createdAt: -1 })
      .populate("updatedBy", "firstName lastName email");
    
    res.json(history);
  } catch (err) {
    console.error("Error fetching pricing history:", err);
    res.status(500).json({ message: "Failed to get pricing history" });
  }
};