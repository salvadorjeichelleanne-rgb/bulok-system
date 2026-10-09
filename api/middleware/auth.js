const jwt = require("jsonwebtoken");

const authenticateAdmin = (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Authentication token is missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
  }
};

module.exports = authenticateAdmin;