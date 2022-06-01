import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  transports: ["websocket"],
  cors: { origin: ["http://localhost:3000"] },
});

export { io, app, httpServer };
