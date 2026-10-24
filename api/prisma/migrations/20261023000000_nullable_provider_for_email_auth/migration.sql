-- AlterTable: make legacy provider/providerId nullable so email-only users can be created
ALTER TABLE "User" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "providerId" DROP NOT NULL;
