-- Add lockedBy to Job table for worker identity tracking
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
