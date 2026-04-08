// Migrations run before table creation — idempotent, safe to re-run
const MIGRATIONS = `
-- Drop groups/group_members if they exist from old schema
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Remove group_id from posts if migrating from old grouped schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE posts DROP COLUMN group_id CASCADE;
  END IF;
END $$;

-- Add the correct unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_user_id_hour_slot_key'
  ) THEN
    ALTER TABLE posts ADD CONSTRAINT posts_user_id_hour_slot_key UNIQUE (user_id, hour_slot);
  END IF;
END $$;
`

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(32) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  hour_slot TIMESTAMPTZ NOT NULL,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hour_slot)
);

CREATE INDEX IF NOT EXISTS idx_posts_hour ON posts(hour_slot DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
`

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: pool } = await import('@/lib/db')
    try {
      await pool.query(MIGRATIONS)
      await pool.query(SCHEMA)
      console.log('[hourly] database schema ready')
    } catch (err) {
      console.error('[hourly] database init error:', err)
    }
  }
}
