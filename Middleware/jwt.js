// middleware/auth.js
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  // Check for the role-based tokens set in the login controller
  const token = req.cookies.adminToken || req.cookies.driverToken || req.cookies.customerToken; 
  
  // 💡 Optional: If you still want to support a generic 'token' cookie, uncomment the next line:
  // const token = req.cookies.adminToken || req.cookies.driverToken || req.cookies.customerToken || req.cookies.token; 

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.decoded = decoded; // attach decoded payload to req
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};