import jwt from "jsonwebtoken";
import prisma from "./db.mjs";

export function generateAccessToken(id, username, role) {
  return jwt.sign({ id, username, role }, process.env.SECRET, {
    expiresIn: "7d",
  });
}

export function decodeToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        reject(null);
      } else {
        resolve(decoded);
      }
    });
  });
}

export async function resolveUser(id) {
  return prisma.user.findFirst({ where: { id: Number(id) } });
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json();
  } else {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = await decodeToken(token);
      req.user = await resolveUser(decoded.id);
      next();
    } catch (err) {
      res.status(401).json();
    }
  }
}

export function isAdmin(req, res, next) {
  if (req.user.role === "admin") {
    next();
  } else {
    res.status(403).json();
  }
}

export function makeId(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
