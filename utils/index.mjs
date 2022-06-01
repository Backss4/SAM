import jwt from "jsonwebtoken";
import prisma from "./db.mjs";

export function generateAccessToken(id, username, role) {
  return jwt.sign({ id, username, role }, process.env.SECRET, {
    expiresIn: "7d",
  });
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json();
  } else {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.SECRET, async (err, decoded) => {
      if (err) {
        res.status(401).json();
      } else {
        try {
          req.user = await prisma.user.findFirst({ where: { id: decoded.id } });
          next();
        } catch (err) {
          res.status(401).json();
        }
      }
    });
  }
}

export function isAdmin(req, res, next) {
  if (req.user.role === "admin") {
    next();
  } else {
    res.status(403).json();
  }
}
