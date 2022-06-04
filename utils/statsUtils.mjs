import prisma from "./db.mjs";

export const addWin = async (playerId) => {
  try {
    await prisma.user.update({
      where: { id: Number(playerId) },
      data: { numberOfWins: { increment: 1 } },
    });
  } catch (err) {}
};

export const addKill = async (playerId) => {
  try {
    await prisma.user.update({
      where: { id: Number(playerId) },
      data: { numberOfKills: { increment: 1 } },
    });
  } catch (err) {}
};

export const addSuicide = async (playerId) => {
  try {
    await prisma.user.update({
      where: { id: Number(playerId) },
      data: { numberOfSuicides: { increment: 1 } },
    });
  } catch (err) {}
};

export const addGame = async (playerId) => {
  try {
    await prisma.user.update({
      where: { id: Number(playerId) },
      data: { numberOfGames: { increment: 1 } },
    });
  } catch (err) {}
};

export const addPowerup = async (playerId) => {
  try {
    await prisma.user.update({
      where: { id: Number(playerId) },
      data: { numberOfPowerups: { increment: 1 } },
    });
  } catch (err) {}
};
