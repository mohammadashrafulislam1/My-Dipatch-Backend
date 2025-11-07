// Middleware/jwt.js
import jwt from "jsonwebtoken";

// jwt.js
export const verifyToken = (expectedRole) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userRole = decoded.role || decoded.type;

      req.user = {
        id: decoded.id || decoded._id,
        type: userRole,
        role: userRole,
      };

      if (expectedRole && userRole !== expectedRole) {
        return res
          .status(403)
          .json({ message: `Forbidden: Only ${expectedRole}s allowed` });
      }

      next();
    } catch (err) {
      console.error("verifyToken error:", err);
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};
