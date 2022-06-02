import {
  generateNewGame,
  MAP_SIZE,
  BOX_PLACE,
  HARD_WALL,
} from "./utils/gameUtils.mjs";
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

  let gameLoopTimeout = null;

  const startGameLoop = () => {
    io.to("game").emit("gameDetails", { map: game.map });
    game.lobby.forEach((player) => {
      if (player.ready) {
        player.doneSomething = false;
      }
    });
    gameLoopTimeout = setTimeout(startGameLoop, 350);
  };

  let startingTimeout = null;

  const startGame = () => {
    const playersStartingPositions = [
      { x: 0, y: 0, color: "Green" },
      { x: MAP_SIZE - 1, y: 0, color: "Red" },
      { x: MAP_SIZE - 1, y: MAP_SIZE - 1, color: "Pink" },
      { x: 0, y: MAP_SIZE - 1, color: "Yellow" },
    ];

    const players = game.lobby.filter((p) => p.ready);
    players.forEach((player, index) => {
      game.map[playersStartingPositions[index].y][
        playersStartingPositions[index].x
      ].player = playersStartingPositions[index].color;

      player.coords = {
        x: playersStartingPositions[index].x,
        y: playersStartingPositions[index].y,
      };
      player.color = playersStartingPositions[index].color;

      player.socket.join("game");
    });

    game.started = true;
    startGameLoop();
  };

  const updateMap = (prev, { coords, color }) => {
    game.map[prev.y][prev.x].player = null;
    game.map[coords.y][coords.x].player = color;
  };

  const playerCanGoThere = (prev, next) => {
    const mapBox = game.map[next.y][next.x];

    if (
      mapBox.player ||
      mapBox.type === BOX_PLACE ||
      mapBox.type === HARD_WALL ||
      mapBox.bomb
    ) {
      return false;
    }

    return true;
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
    const player = {
      socket,
      ready: false,
      coords: null,
      color: null,
      doneSomething: false,
    };
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

    socket.on("changePos", ({ direction }) => {
      if (game.started && !player.doneSomething) {
        const prev = { ...player.coords };
        const next = { ...player.coords };

        switch (direction) {
          case "up":
            if (prev.y > 0) {
              next.y--;
              player.doneSomething = true;
            }
            break;
          case "down":
            if (prev.y < MAP_SIZE - 1) {
              next.y++;
              player.doneSomething = true;
            }
            break;
          case "left":
            if (prev.x > 0) {
              next.x--;
              player.doneSomething = true;
            }
            break;
          case "right":
            if (prev.x < MAP_SIZE - 1) {
              next.x++;
              player.doneSomething = true;
            }
        }

        if (playerCanGoThere(prev, next)) {
          player.coords = next;
          updateMap(prev, player);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`Player ${socket.user.username} disconnected`);
      if (player.ready && game.starting && !game.started) {
        game.starting = false;
        clearTimeout(startingTimeout);
      }
      socket.leave("game");
      game.lobby = game.lobby.filter((p) => p.socket.id !== socket.id);

      if (game.started) {
        // todo: remove from player list or not idk XD
      }
    });
  });
}
