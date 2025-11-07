// Middleware/jwt.js
import jwt from "jsonwebtoken";

export const verifyToken = (expectedRole) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Attach user data directly for controllers to use
      req.user = {
        id: decoded.id || decoded._id, // token payload must include this
        type: decoded.type || decoded.role || "customer", // safe fallback
        role: decoded.role,
      };

      // ✅ Check role if expectedRole is specified
      if (expectedRole && decoded.role !== expectedRole) {
        return res.status(403).json({ message: "Forbidden: Invalid role" });
      }

      next();
    } catch (err) {
      console.error("verifyToken error:", err);
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
