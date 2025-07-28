// Basic admin auth middleware
export const adminAuth = (req, res, next) => {
    try {
      // Assuming you have user information in req.user
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      res.status(500).json({ message: "Authentication error" });
    }
  };