-- AlterTable
ALTER TABLE "User" ADD COLUMN     "numberOfDeaths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numberOfGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numberOfKills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numberOfWins" INTEGER NOT NULL DEFAULT 0;