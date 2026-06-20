const express = require('express');
const supabase = require('../db/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { notify } = require('../middleware/notify');

const router = express.Router();

// ── GET /api/events ───────────────────────────────────────
// Public (published only) or coordinator sees their own drafts
router.get('/', authMiddleware, async (req, res) => {
  const { category, dept, status } = req.query;
  let query = supabase
    .from('events')
    .select('*, coordinator:users!coordinator_id(id, name, avatar, dept)')
    .order('date', { ascending: true });

  if (req.user.role === 'coordinator') {
    // coordinators see their own events (published + draft)
    query = query.eq('coordinator_id', req.user.id);
  } else {
    // students and faculty see only published events
    query = query.eq('published', true);
  }

  if (category) query = query.eq('category', category);
  if (dept)     query = query.eq('dept', dept);
  if (status)   query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Attach registration count for each event
  const withCounts = await Promise.all(data.map(async (evt) => {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', evt.id)
      .neq('status', 'rejected');
    return { ...evt, registration_count: count || 0 };
  }));

  res.json({ events: withCounts });
});

// ── GET /api/events/:id ───────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  const { data: evt, error } = await supabase
    .from('events')
    .select('*, coordinator:users!coordinator_id(id, name, avatar, dept)')
    .eq('id', req.params.id)
    .single();

  if (error || !evt) return res.status(404).json({ error: 'Event not found' });
  res.json({ event: evt });
});

// ── POST /api/events ──────────────────────────────────────
router.post('/', authMiddleware, requireRole('coordinator'), async (req, res) => {
  const { title, description, category, date, time, venue, dept, capacity } = req.body;
  if (!title || !date || !venue || !category)
    return res.status(400).json({ error: 'title, date, venue, and category are required' });

  const { data: evt, error } = await supabase
    .from('events')
    .insert({
      title, description, category, date, time, venue,
      dept: dept || req.user.dept,
      capacity: capacity || 50,
      coordinator_id: req.user.id,
      published: false,
      status: 'upcoming',
      schedule: [],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ event: evt });
});

// ── PATCH /api/events/:id ─────────────────────────────────
router.patch('/:id', authMiddleware, requireRole('coordinator'), async (req, res) => {
  // Confirm ownership
  const { data: existing } = await supabase
    .from('events').select('coordinator_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  if (existing.coordinator_id !== req.user.id)
    return res.status(403).json({ error: 'You can only edit your own events' });

  const allowed = ['title','description','date','time','venue','capacity','status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  updates.updated_at = new Date().toISOString();

  const { data: evt, error } = await supabase
    .from('events').update(updates).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Notify all approved registrants
  const { data: regs } = await supabase
    .from('registrations').select('student_id').eq('event_id', req.params.id).eq('status', 'approved');
  await Promise.all((regs || []).map(r =>
    notify(r.student_id, `Event "${evt.title}" has been updated. Check the latest details.`, 'info')
  ));

  res.json({ event: evt });
});

// ── PATCH /api/events/:id/publish ────────────────────────
router.patch('/:id/publish', authMiddleware, requireRole('coordinator'), async (req, res) => {
  const { published } = req.body; // true or false

  const { data: existing } = await supabase
    .from('events').select('coordinator_id, title').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  if (existing.coordinator_id !== req.user.id)
    return res.status(403).json({ error: 'Not your event' });

  const { data: evt, error } = await supabase
    .from('events').update({ published }).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ event: evt });
});

// ── PATCH /api/events/:id/schedule ───────────────────────
router.patch('/:id/schedule', authMiddleware, requireRole('coordinator'), async (req, res) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule))
    return res.status(400).json({ error: 'schedule must be an array' });

  const { data: existing } = await supabase
    .from('events').select('coordinator_id, title').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  if (existing.coordinator_id !== req.user.id)
    return res.status(403).json({ error: 'Not your event' });

  const { data: evt, error } = await supabase
    .from('events').update({ schedule, updated_at: new Date() }).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Notify approved registrants of schedule update
  const { data: regs } = await supabase
    .from('registrations').select('student_id').eq('event_id', req.params.id).eq('status', 'approved');
  await Promise.all((regs || []).map(r =>
    notify(r.student_id, `Schedule updated for "${evt.title}". Check the latest timings!`, 'info')
  ));

  res.json({ event: evt });
});

module.exports = router;
