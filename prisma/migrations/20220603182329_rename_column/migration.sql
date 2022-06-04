/*
  Warnings:

  - You are about to drop the column `numberOfDeaths` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "numberOfDeaths",
ADD COLUMN     "numberOfSuicides" INTEGER NOT NULL DEFAULT 0;
