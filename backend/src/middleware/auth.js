import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const TOKEN_TTL = "7d";

export function signUserToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Must run after requireAuth. Confirms the authenticated user matches
 * the :id route param so a valid token for one account can't be used
 * to read/write another account's data.
 */
export function requireOwnership(req, res, next) {
  if (req.params.id !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
