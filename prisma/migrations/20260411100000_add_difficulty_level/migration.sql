-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('Easy', 'Medium', 'Hard');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'Easy',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
