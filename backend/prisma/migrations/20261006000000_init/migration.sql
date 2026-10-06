CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'RETIRED');
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO', 'TEXT');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentModule" TEXT NOT NULL DEFAULT 'workbench-v2',
    "requiredModule" TEXT NOT NULL DEFAULT 'workbench-v2',
    "schemaVersion" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "step" TEXT NOT NULL DEFAULT 'outline',
    "scriptText" TEXT NOT NULL DEFAULT '',
    "baseVersion" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScriptVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScriptVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportSnapshot" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT,
    "label" TEXT NOT NULL,
    "scriptText" TEXT NOT NULL,
    "scriptVersion" INTEGER NOT NULL,
    "step" TEXT NOT NULL,
    "exportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModuleMigration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromModule" TEXT NOT NULL,
    "toModule" TEXT NOT NULL,
    "fromSchema" INTEGER NOT NULL,
    "toSchema" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "migratedById" TEXT NOT NULL,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleMigration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE UNIQUE INDEX "Membership_userId_projectId_key" ON "Membership"("userId", "projectId");
CREATE INDEX "Membership_projectId_idx" ON "Membership"("projectId");
CREATE UNIQUE INDEX "Session_slug_key" ON "Session"("slug");
CREATE INDEX "Session_projectId_deletedAt_idx" ON "Session"("projectId", "deletedAt");
CREATE UNIQUE INDEX "Asset_slug_key" ON "Asset"("slug");
CREATE INDEX "Asset_projectId_deletedAt_idx" ON "Asset"("projectId", "deletedAt");
CREATE UNIQUE INDEX "ScriptVersion_sessionId_version_key" ON "ScriptVersion"("sessionId", "version");
CREATE INDEX "ScriptVersion_projectId_createdAt_idx" ON "ScriptVersion"("projectId", "createdAt");
CREATE UNIQUE INDEX "ExportSnapshot_slug_key" ON "ExportSnapshot"("slug");
CREATE INDEX "ExportSnapshot_projectId_createdAt_idx" ON "ExportSnapshot"("projectId", "createdAt");
CREATE INDEX "ModuleMigration_projectId_migratedAt_idx" ON "ModuleMigration"("projectId", "migratedAt");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptVersion" ADD CONSTRAINT "ScriptVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptVersion" ADD CONSTRAINT "ScriptVersion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportSnapshot" ADD CONSTRAINT "ExportSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportSnapshot" ADD CONSTRAINT "ExportSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExportSnapshot" ADD CONSTRAINT "ExportSnapshot_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModuleMigration" ADD CONSTRAINT "ModuleMigration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleMigration" ADD CONSTRAINT "ModuleMigration_migratedById_fkey" FOREIGN KEY ("migratedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
