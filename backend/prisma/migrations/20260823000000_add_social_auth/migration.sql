ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK');

CREATE TABLE "UserAuthProvider" (
    "id" SERIAL NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAuthProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAuthProvider_provider_providerId_key" ON "UserAuthProvider"("provider", "providerId");
CREATE UNIQUE INDEX "UserAuthProvider_provider_userId_key" ON "UserAuthProvider"("provider", "userId");
CREATE INDEX "UserAuthProvider_userId_idx" ON "UserAuthProvider"("userId");

ALTER TABLE "UserAuthProvider" ADD CONSTRAINT "UserAuthProvider_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
