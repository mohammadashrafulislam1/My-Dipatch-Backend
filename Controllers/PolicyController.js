import { PolicyModel } from "../Model/Policy.js";


// Get both policies
export const getPolicies = async (req, res) => {
  try {
    const terms = await PolicyModel.findOne({ type: "terms" });
    const privacy = await PolicyModel.findOne({ type: "privacy" });
    
    res.json({
      terms: terms || { title: "Terms & Conditions", content: "" },
      privacy: privacy || { title: "Privacy Policy", content: "" }
    });
  } catch (err) {
    console.error("Error fetching policies:", err);
    res.status(500).json({ message: "Failed to fetch policies" });
  }
};

// Update a policy
export const updatePolicy = async (req, res) => {
  const { type } = req.params;
  const { title, content } = req.body;
  const adminId = req.user.id;
  
  try {
    if (!["terms", "privacy"].includes(type)) {
      return res.status(400).json({ message: "Invalid policy type" });
    }
    
    const updatedPolicy = await PolicyModel.findOneAndUpdate(
      { type },
      { title, content, lastUpdated: new Date(), updatedBy: adminId },
      { new: true, upsert: true }
    );
    
    res.json({
      message: `${type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'} updated`,
      policy: updatedPolicy
    });
  } catch (err) {
    console.error("Error updating policy:", err);
    res.status(500).json({ message: "Failed to update policy" });
  }
};

// Get policy history (optional)
export const getPolicyHistory = async (req, res) => {
  try {
    const history = await PolicyModel.find()
      .sort({ lastUpdated: -1 })
      .populate("updatedBy", "firstName lastName");
    
    res.json(history);
  } catch (err) {
    console.error("Error fetching policy history:", err);
    res.status(500).json({ message: "Failed to fetch policy history" });
  }
};