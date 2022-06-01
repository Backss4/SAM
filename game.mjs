import { decodeToken, resolveUser } from "./utils/index.mjs";
import { io } from "./utils/serverSetup.mjs";

export function game() {
  const game = { lobby: [], started: false };

  io.use(async (socket, next) => {
    try {
      const decoded = await decodeToken(socket.handshake.auth.token);
      socket.user = await resolveUser(decoded.id);
      next();
    } catch (err) {
      socket.disconnect(true);
    }
  });

  io.on("connection", (socket) => {
    const player = { socket, ready: false };
    game.lobby.push(player);
    console.log(`Player ${socket.user.username} connected`);

    socket.on("ready", () => {
      player.ready = true;
      socket.emit("lobbyStatusChange", player.ready);
    });

    socket.on("notReady", () => {
      player.ready = false;
      socket.emit("lobbyStatusChange", player.ready);
    });

    socket.on("disconnect", () => {
      console.log(`Player ${socket.user.username} disconnected`);
      game.lobby = game.lobby.filter((s) => s.id !== socket.id);
    });
  });
}
