// middleware/auth.js
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token; // token should come from cookie
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.decoded = decoded; // attach decoded payload to req
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
