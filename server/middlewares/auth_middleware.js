const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/api_response");

const secret = process.env.JWT_SECRET || "smart-dashboard-jwt-secret";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return sendError(res, "Unauthorized", {}, 401);
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (error) {
    return sendError(res, "Invalid token", { detail: error.message }, 401);
  }
};

module.exports = authMiddleware;
