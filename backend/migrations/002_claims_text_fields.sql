-- Migration 002: Replace FK columns with plain text fields in claims table
-- project_id (UUID FK) → project_no (TEXT)
-- budget_head_id (UUID FK) → budget_head (TEXT)

BEGIN;

-- Step 1: Add new text columns (nullable initially for safe migration)
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS project_no   TEXT,
  ADD COLUMN IF NOT EXISTS budget_head  TEXT;

-- Step 2: Copy existing data from joined tables into new text columns
UPDATE claims c
SET
  project_no  = p.project_no,
  budget_head = bh.head_name
FROM projects p, budget_heads bh
WHERE c.project_id = p.id
  AND c.budget_head_id = bh.id;

-- Also handle claims that only have project_id but no budget_head_id
UPDATE claims c
SET project_no = p.project_no
FROM projects p
WHERE c.project_id = p.id
  AND c.project_no IS NULL;

-- Step 3: Drop old FK columns
ALTER TABLE claims
  DROP COLUMN IF EXISTS project_id,
  DROP COLUMN IF EXISTS budget_head_id;

COMMIT;
