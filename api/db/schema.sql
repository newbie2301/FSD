-- ============================================================
--  EXP-03 College Event Management System
--  Run this in your Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- ── 1. Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,          -- bcrypt hashed
  role        TEXT NOT NULL CHECK (role IN ('student', 'coordinator', 'faculty')),
  dept        TEXT NOT NULL,
  avatar      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN ('Technical','Cultural','Workshop','Sports','General')),
  date            DATE NOT NULL,
  time            TIME,
  venue           TEXT NOT NULL,
  dept            TEXT NOT NULL,
  capacity        INT NOT NULL DEFAULT 50,
  coordinator_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published       BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed')),
  schedule        JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Registrations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','approved','rejected')),
  approved_by     UUID REFERENCES users(id),
  attended        BOOLEAN DEFAULT FALSE,
  registered_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);

-- ── 4. Volunteers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS volunteers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);

-- ── 5. Notifications ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','error')),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Feedback ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  faculty_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, faculty_id)
);

-- ── Indexes for performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_coordinator   ON events(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_events_dept          ON events(dept);
CREATE INDEX IF NOT EXISTS idx_events_status        ON events(status);
CREATE INDEX IF NOT EXISTS idx_registrations_event  ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_event       ON feedback(event_id);

-- ── Seed: demo users (password = "demo1234" for all) ──────
-- bcrypt hash of "demo1234" with salt rounds 10
INSERT INTO users (name, email, password, role, dept, avatar) VALUES
  ('Ananya Krishnan', 'ananya@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student',     'CSE', 'AK'),
  ('Rahul Selvam',    'rahul@college.edu',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student',     'ECE', 'RS'),
  ('Karthik Rajan',   'karthik@college.edu','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'coordinator', 'CSE', 'KR'),
  ('Divya Menon',     'divya@college.edu',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'coordinator', 'ECE', 'DM'),
  ('Dr. Suresh Kumar','suresh@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'faculty',     'CSE', 'SK'),
  ('Dr. Meera Pillai','meera@college.edu',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'faculty',     'ECE', 'MP')
ON CONFLICT (email) DO NOTHING;
