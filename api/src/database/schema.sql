-- Applied on API startup. Every statement can run again safely.
-- gen_random_uuid() is built into PostgreSQL 13+, so pgcrypto is unnecessary.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'todo_status') THEN
    CREATE TYPE todo_status AS ENUM ('open', 'done');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'todo_source') THEN
    CREATE TYPE todo_source AS ENUM ('user', 'sample');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  notes text,
  status todo_status NOT NULL DEFAULT 'open',
  source todo_source NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT todos_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  CONSTRAINT todos_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000)
);

-- The list query filters source = 'user', so this partial index matches it.
-- A partial index is smaller because rows from the sample seed are left out.
CREATE INDEX IF NOT EXISTS todos_user_created_idx
  ON todos (created_at DESC)
  WHERE source = 'user';

-- The EXPLAIN lab query is: status = 'open' ORDER BY created_at DESC LIMIT 20.
-- Postgres can use this index only when the query implies status = 'open'.
CREATE INDEX IF NOT EXISTS todos_open_created_idx
  ON todos (created_at DESC)
  WHERE status = 'open';

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS todos_set_updated_at ON todos;
CREATE TRIGGER todos_set_updated_at
BEFORE UPDATE ON todos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ANALYZE todos;
