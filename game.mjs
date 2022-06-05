import {
  generateNewGame,
  MAP_SIZE,
  BOX_PLACE,
  HARD_WALL,
  updateMapWithExplosion,
} from "./utils/gameUtils.mjs";
import { decodeToken, resolveUser } from "./utils/index.mjs";
import { io } from "./utils/serverSetup.mjs";
import {
  addGame,
  addKill,
  addSuicide,
  addWin,
  addPowerup,
} from "./utils/statsUtils.mjs";

const MAX_PLAYERS = 2;

export function game() {
  const game = {
    lobby: [],
    started: false,
    starting: false,
    powerupCounter: 0,
    map: generateNewGame(),
  };

  const endGame = () => {
    let timeout = setTimeout(() => {}, 0);
    while (--timeout >= 0) {
      clearTimeout(timeout);
      timeout--;
    }

    game.lobby = game.lobby.filter((player) => player.socket.connected);
    const playersInGame = game.lobby.filter((player) => player.ready);

    game.lobby.forEach((player) => {
      player.coords = null;
      player.color = null;
      player.doneSomething = false;
      player.isDead = false;
      player.ready = false;
      player.hasPowerup = false;
      player.socket.emit("lobbyStatusChange", player.ready);
    });

    io.to("game").emit("gameEnded");

    playersInGame.forEach((player) => {
      player.socket.leave("game");
    });

    game.started = false;
    game.starting = false;
    game.powerupCounter = 0;
    game.map = generateNewGame();
  };

  const startGameLoop = () => {
    game.lobby.forEach((player) => {
      if (player.ready) {
        if (game.map[player.coords.y][player.coords.x].explosion.length > 0) {
          player.isDead = true;
          if (
            game.map[player.coords.y][player.coords.x].explosion.includes(
              player.socket.user.id
            )
          ) {
            addSuicide(player.socket.user.id);
          } else {
            game.map[player.coords.y][player.coords.x].explosion.forEach(
              (id) => {
                addKill(id);
              }
            );
          }

          game.map[player.coords.y][player.coords.x].player = null;
          player.socket.emit("killed");
        }
        player.doneSomething = false;
      }
    });
    io.to("game").emit("gameDetails", { map: game.map });

    const playersAlive = game.lobby.filter(
      (player) => player.ready && !player.isDead
    );

    if (playersAlive.length === 1) {
      game.lobby.forEach((p) => {
        if (p.ready) {
          addGame(p.socket.user.id);
        }
      });
      addWin(playersAlive[0].socket.user.id);
      // ending game;
      endGame();
      return;
    }

    setTimeout(startGameLoop, 200);
  };

  let startingTimeout = null;

  const addPowerupToMap = () => {
    if (!game.started) return;
    while (1) {
      const x = Math.floor(Math.random() * MAP_SIZE);
      const y = Math.floor(Math.random() * MAP_SIZE);

      if (
        game.map[y][x].player === null &&
        game.map[y][x].powerup === 0 &&
        game.map[y][x].bomb === false &&
        game.map[y][x].type !== HARD_WALL
      ) {
        const id = ++game.powerupCounter;
        game.map[y][x].powerup = id;
        setTimeout(() => {
          if (game.started) {
            if (game.map[y][x].powerup === id) {
              game.map[y][x].powerup = false;
            }
          }
        }, 7000);
        break;
      }
    }

    setTimeout(addPowerupToMap, Math.round(Math.random() * 5000) + 5000);
  };

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

    setTimeout(addPowerupToMap, Math.random() * 10000);

    game.started = true;

    const playersInGame = players.map((p) => ({
      username: p.socket.user.username,
      color: p.color,
    }));

    io.to("game").emit("playersInGame", playersInGame);

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
      isDead: false,
      hasPowerup: false,
      powerupTimeout: null,
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
      if (game.started && !player.doneSomething && !player.isDead) {
        const prev = { ...player.coords };
        const next = { ...player.coords };

        switch (direction) {
          case "up":
            if (prev.y > 0) {
              next.y--;
            }
            break;
          case "down":
            if (prev.y < MAP_SIZE - 1) {
              next.y++;
            }
            break;
          case "left":
            if (prev.x > 0) {
              next.x--;
            }
            break;
          case "right":
            if (prev.x < MAP_SIZE - 1) {
              next.x++;
            }
        }

        if (playerCanGoThere(prev, next)) {
          player.coords = next;
          player.doneSomething = true;
          if (game.map[next.y][next.x].powerup) {
            player.hasPowerup = true;
            addPowerup(player.socket.user.id);
            clearTimeout(player.powerupTimeout);
            player.powerupTimeout = setTimeout(() => {
              player.hasPowerup = false;
            }, 10000);
            game.map[next.y][next.x].powerup = 0;
          }
          updateMap(prev, player);
        }
      }
    });

    socket.on("placeBomb", () => {
      if (game.started && !player.isDead) {
        const bomb = { ...player.coords, length: player.hasPowerup ? 6 : 3 };
        if (!game.map[bomb.y][bomb.x].bomb) {
          game.map[bomb.y][bomb.x].bomb = true;

          // wait for destonation
          setTimeout(() => {
            if (!game.started) return;
            game.map[bomb.y][bomb.x].bomb = false;
            updateMapWithExplosion(game.map, bomb, "+", player.socket.user.id);

            setTimeout(() => {
              if (!game.started) return;
              updateMapWithExplosion(
                game.map,
                bomb,
                "-",
                player.socket.user.id
              );
            }, 1000);
          }, 2000);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`Player ${socket.user.username} disconnected`);
      socket.disconnect(true);
      if (player.ready && game.starting && !game.started) {
        game.starting = false;
        clearTimeout(startingTimeout);
      }

      if (!game.started) {
        game.lobby = game.lobby.filter((p) => p.socket.id !== socket.id);
      }

      socket.leave("game");
    });
  });
}
