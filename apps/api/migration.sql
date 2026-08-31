-- Phase 4 response privacy migration.
-- Response records contain only surveyId, nullifier and answers.
-- If an older database contains proof_verification_id, remove it.
ALTER TABLE "responses" DROP COLUMN IF EXISTS "proof_verification_id";
