-- CreateEnum
CREATE TYPE "PlayerTeam" AS ENUM ('STRONG', 'SMART', 'OG');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "playerNumber" INTEGER,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "team" "PlayerTeam" NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "groupNumber" INTEGER,
    "extraFields" JSONB,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "type" "VoteType" NOT NULL DEFAULT 'UPVOTE',
    "sessionId" TEXT,
    "voterId" TEXT,
    "dayPacific" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "backgroundImageUrl" TEXT,
    "logoUrl" TEXT,
    "frontendPasswordEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frontendPassword" TEXT,
    "dailyVoteLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pauseVoting" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" SERIAL NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_playerNumber_key" ON "Player"("playerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "Vote_playerId_idx" ON "Vote"("playerId");

-- CreateIndex
CREATE INDEX "Vote_playerId_type_idx" ON "Vote"("playerId", "type");

-- CreateIndex
CREATE INDEX "Vote_createdAt_idx" ON "Vote"("createdAt");

-- CreateIndex
CREATE INDEX "Vote_playerId_type_sessionId_createdAt_idx" ON "Vote"("playerId", "type", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Vote_playerId_voterId_dayPacific_idx" ON "Vote"("playerId", "voterId", "dayPacific");

-- CreateIndex
CREATE INDEX "Vote_dayPacific_idx" ON "Vote"("dayPacific");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "Visitor_date_idx" ON "Visitor"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_ipAddress_date_key" ON "Visitor"("ipAddress", "date");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

