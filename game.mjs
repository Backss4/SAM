import { generateNewGame } from "./utils/gameUtils.mjs";
import { decodeToken, resolveUser } from "./utils/index.mjs";
import { io } from "./utils/serverSetup.mjs";

const MAX_PLAYERS = 2;

export function game() {
  const game = {
    lobby: [],
    started: false,
    starting: false,
    map: generateNewGame(),
  };

  const emitGameState = () => {
    io.to("game").emit("gameDetails", { map: game.map });
  };

  let startingTimeout = null;

  const startGame = () => {
    game.lobby.forEach((p) => {
      if (p.ready) {
        p.socket.join("game");
      }
    });
    game.started = true;
    emitGameState();
  };

  io.use(async (socket, next) => {
    try {
      const decoded = await decodeToken(socket.handshake.auth.token);
      socket.user = await resolveUser(decoded.id);
      if (game.lobby.find((p) => p.socket.user.id === socket.user.id)) {
        throw new Error("this user already connected");
      }
      next();
    } catch (err) {
      socket.disconnect();
    }
  });

  io.on("connection", (socket) => {
    const player = { socket, ready: false };
    game.lobby.push(player);
    console.log(`Player ${socket.user.username} connected`);

    socket.on("ready", () => {
      if (!game.starting) {
        player.ready = true;
        socket.emit("lobbyStatusChange", player.ready);
        if (game.lobby.filter((p) => p.ready).length === MAX_PLAYERS) {
          game.starting = true;
          startingTimeout = setTimeout(startGame, 2000);
        }
      }
    });

    socket.on("notReady", () => {
      if (!game.starting) {
        player.ready = false;
        socket.emit("lobbyStatusChange", player.ready);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Player ${socket.user.username} disconnected`);
      if (player.ready && game.starting && !game.started) {
        game.starting = false;
        clearTimeout(startingTimeout);
      }
      game.lobby = game.lobby.filter((p) => p.socket.id !== socket.id);

      if (game.started) {
        // todo: remove from player list or not idk XD
      }
    });
  });
}
