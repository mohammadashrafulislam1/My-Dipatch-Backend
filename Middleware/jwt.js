// middleware/auth.js
import jwt from "jsonwebtoken";

export const verifyToken = (role) => (req, res, next) => {
  let token;
  if (role === 'customer') token = req.cookies.customerToken;
  else if (role === 'driver') token = req.cookies.driverToken;
  else if (role === 'admin') token = req.cookies.adminToken;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    req.decoded = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
