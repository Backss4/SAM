import express from "express";
import { config } from "dotenv";
import bcrypt from "bcrypt";
import cors from "cors";
import {
  generateAccessToken,
  authMiddleware,
  isAdmin,
  makeId,
} from "./utils/index.mjs";
import prisma from "./utils/db.mjs";
import { app, httpServer, io } from "./utils/serverSetup.mjs";
import { game } from "./game.mjs";
import { Auth } from "googleapis";

config({ path: "./" });

const port = 3001;

const basicUserStatus = Boolean(Number(process.env.BASIC_USER_STATUS));

const oAuthClient = new Auth.OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_SECRET
);

(async () => {
  try {
    if (!(await prisma.user.findFirst({ where: { role: "admin" } }))) {
      console.log("Creating admin");
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("123", salt);
      await prisma.user.create({
        data: {
          username: "admin",
          password: passwordHash,
          active: true,
          role: "admin",
        },
      });
    }
  } catch (err) {}
})();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json();
  } else {
    const user = await prisma.user.findFirst({ where: { username: username } });
    if (!user) {
      res.status(400).json();
      return;
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!user || !validPassword || !user.active) {
      res.status(401).json();
    } else {
      res.json({ jwt: generateAccessToken(user.id, user.username, user.role) });
    }
  }
});

app.post("/oauth", async (req, res) => {
  try {
    const { token } = req.body;
    const tokenInfo = await oAuthClient.getTokenInfo(token);
    const email = tokenInfo.email;

    let user = await prisma.user.findFirst({ where: { username: email } });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(makeId(20), salt);
      user = await prisma.user.create({
        data: {
          username: email,
          password: passwordHash,
          active: true,
        },
      });
    }

    res.json({ jwt: generateAccessToken(user.id, user.username, user.role) });
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findFirst({ where: { username: username } });
  if (!username || !password || user) {
    res.status(400).json();
  } else {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await prisma.user.create({
      data: {
        username: username,
        password: passwordHash,
        active: basicUserStatus,
      },
    });
    res.status(201).json();
  }
});

app.post("/activate/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { password, ...updatedUser } = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { active: true },
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(400).json();
  }
});

app.get("/users", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const mappedUsers = users.map(({ password, ...user }) => user);

    res.status(200).json(mappedUsers);
  } catch (err) {
    res.status(400).json();
  }
});

app.delete("/users/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    io.sockets.sockets.forEach((soc) => {
      if (soc.user.id === Number(req.params.id)) {
        soc.disconnect(true);
      }
    });

    await prisma.user.delete({
      where: { id: Number(req.params.id) },
    });

    res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
});

app.get("/stats", authMiddleware, async (req, res) => {
  try {
    const {
      user: {
        numberOfGames,
        numberOfWins,
        numberOfKills,
        numberOfSuicides,
        numberOfPowerups,
      },
    } = req;
    res.status(200).json({
      numberOfKills,
      numberOfSuicides,
      numberOfWins,
      numberOfGames,
      numberOfPowerups,
    });
  } catch (err) {
    res.status(400).json();
  }
});

app.use((req, res) => res.status(404).json({ message: "No route found" }));

game();

httpServer.listen(port);
