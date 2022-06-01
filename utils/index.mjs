import jwt from "jsonwebtoken";

export function generateAccessToken(id, username, role) {
  return jwt.sign({ id, username, role }, secret, { expiresIn: "7d" });
}
