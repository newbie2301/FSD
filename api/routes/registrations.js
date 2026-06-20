const express = require('express');
const supabase = require('../db/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { notify } = require('../middleware/notify');

const router = express.Router();

// ── POST /api/registrations ───────────────────────────────
// Student registers for an event
router.post('/', authMiddleware, requireRole('student'), async (req, res) => {
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id is required' });

  // Fetch event
  const { data: evt } = await supabase
    .from('events').select('*').eq('id', event_id).single();
  if (!evt)         return res.status(404).json({ error: 'Event not found' });
  if (!evt.published) return res.status(400).json({ error: 'Event is not open for registration' });
  if (evt.status !== 'upcoming') return res.status(400).json({ error: 'Event is not upcoming' });

  // Check duplicate
  const { data: existing } = await supabase
    .from('registrations').select('id').eq('event_id', event_id).eq('student_id', req.user.id).single();
  if (existing) return res.status(409).json({ error: 'Already registered for this event' });

  // Check capacity (count non-rejected registrations)
  const { count } = await supabase
    .from('registrations').select('*', { count: 'exact', head: true })
    .eq('event_id', event_id).neq('status', 'rejected');
  if (count >= evt.capacity)
    return res.status(400).json({ error: 'Event is full' });

  // Create registration
  const { data: reg, error } = await supabase
    .from('registrations')
    .insert({ event_id, student_id: req.user.id, status: 'pending_approval' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Notify student
  await notify(req.user.id, `Your registration for "${evt.title}" is pending faculty approval.`, 'info');

  // Notify faculty in same dept
  const { data: facultyList } = await supabase
    .from('users').select('id').eq('role', 'faculty').eq('dept', evt.dept);
  await Promise.all((facultyList || []).map(f =>
    notify(f.id, `${req.user.name} requests approval to attend "${evt.title}".`, 'info')
  ));

  // Notify coordinator
  await notify(evt.coordinator_id, `New registration for "${evt.title}" — awaiting faculty approval.`, 'info');

  res.status(201).json({ registration: reg });
});

// ── DELETE /api/registrations/:eventId ───────────────────
// Student cancels their own registration
router.delete('/:eventId', authMiddleware, requireRole('student'), async (req, res) => {
  const { data: reg } = await supabase
    .from('registrations')
    .select('*').eq('event_id', req.params.eventId).eq('student_id', req.user.id).single();

  if (!reg) return res.status(404).json({ error: 'Registration not found' });
  if (reg.status === 'approved')
    return res.status(400).json({ error: 'Cannot cancel an approved registration. Contact your faculty.' });

  await supabase.from('registrations').delete()
    .eq('event_id', req.params.eventId).eq('student_id', req.user.id);

  const { data: evt } = await supabase.from('events').select('title').eq('id', req.params.eventId).single();
  await notify(req.user.id, `Your registration for "${evt?.title}" has been cancelled.`, 'info');

  res.json({ message: 'Registration cancelled' });
});

// ── GET /api/registrations/my ─────────────────────────────
// Student views their own registrations
router.get('/my', authMiddleware, requireRole('student'), async (req, res) => {
  const { data, error } = await supabase
    .from('registrations')
    .select('*, event:events(id, title, date, time, venue, dept, status, category)')
    .eq('student_id', req.user.id)
    .order('registered_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ registrations: data });
});

// ── GET /api/registrations/event/:eventId ────────────────
// Coordinator or faculty views registrations for an event
router.get('/event/:eventId', authMiddleware, requireRole('coordinator', 'faculty'), async (req, res) => {
  const { data, error } = await supabase
    .from('registrations')
    .select('*, student:users!student_id(id, name, email, dept, avatar)')
    .eq('event_id', req.params.eventId)
    .order('registered_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ registrations: data });
});

// ── GET /api/registrations/pending ───────────────────────
// Faculty views all pending approvals for their dept
router.get('/pending', authMiddleware, requireRole('faculty'), async (req, res) => {
  // Get events in this faculty's dept
  const { data: deptEvents } = await supabase
    .from('events').select('id, title, date, venue, dept').eq('dept', req.user.dept);
  const eventIds = (deptEvents || []).map(e => e.id);

  if (eventIds.length === 0) return res.json({ registrations: [] });

  const { data, error } = await supabase
    .from('registrations')
    .select('*, student:users!student_id(id, name, email, dept, avatar)')
    .in('event_id', eventIds)
    .eq('status', 'pending_approval')
    .order('registered_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Attach event info manually
  const eventMap = Object.fromEntries(deptEvents.map(e => [e.id, e]));
  const withEvent = (data || []).map(r => ({ ...r, event: eventMap[r.event_id] }));

  res.json({ registrations: withEvent });
});

// ── PATCH /api/registrations/:id/approve ─────────────────
router.patch('/:id/approve', authMiddleware, requireRole('faculty'), async (req, res) => {
  const { data: reg } = await supabase.from('registrations').select('*, event:events(title, coordinator_id, dept)').eq('id', req.params.id).single();
  if (!reg) return res.status(404).json({ error: 'Registration not found' });
  if (reg.event.dept !== req.user.dept)
    return res.status(403).json({ error: 'This event is not in your department' });

  const { data: updated, error } = await supabase
    .from('registrations')
    .update({ status: 'approved', approved_by: req.user.id })
    .eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });

  await notify(reg.student_id, `Your registration for "${reg.event.title}" has been approved! 🎉`, 'success');
  await notify(reg.event.coordinator_id, `${req.user.name} approved a registration for "${reg.event.title}".`, 'info');

  res.json({ registration: updated });
});

// ── PATCH /api/registrations/:id/reject ──────────────────
router.patch('/:id/reject', authMiddleware, requireRole('faculty'), async (req, res) => {
  const { reason = '' } = req.body;
  const { data: reg } = await supabase.from('registrations').select('*, event:events(title, dept)').eq('id', req.params.id).single();
  if (!reg) return res.status(404).json({ error: 'Registration not found' });
  if (reg.event.dept !== req.user.dept)
    return res.status(403).json({ error: 'This event is not in your department' });

  const { data: updated, error } = await supabase
    .from('registrations')
    .update({ status: 'rejected', approved_by: req.user.id })
    .eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });

  const msg = reason
    ? `Your registration for "${reg.event.title}" was not approved. Reason: ${reason}`
    : `Your registration for "${reg.event.title}" was not approved.`;
  await notify(reg.student_id, msg, 'error');

  res.json({ registration: updated });
});

module.exports = router;
