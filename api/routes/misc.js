const express = require('express');
const supabase = require('../db/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { notify } = require('../middleware/notify');

// ── Volunteers ────────────────────────────────────────────
const volunteersRouter = express.Router();

// GET /api/volunteers/:eventId
volunteersRouter.get('/:eventId', authMiddleware, requireRole('coordinator'), async (req, res) => {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*, student:users!student_id(id, name, email, dept, avatar)')
    .eq('event_id', req.params.eventId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ volunteers: data });
});

// POST /api/volunteers
volunteersRouter.post('/', authMiddleware, requireRole('coordinator'), async (req, res) => {
  const { event_id, student_id, task } = req.body;
  if (!event_id || !student_id || !task)
    return res.status(400).json({ error: 'event_id, student_id, and task are required' });

  const { data: evt } = await supabase.from('events').select('title, coordinator_id').eq('id', event_id).single();
  if (!evt) return res.status(404).json({ error: 'Event not found' });
  if (evt.coordinator_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });

  const { data, error } = await supabase
    .from('volunteers').insert({ event_id, student_id, task }).select().single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.message });

  await notify(student_id, `You've been assigned as a volunteer for "${evt.title}" — Task: ${task}`, 'info');
  res.status(201).json({ volunteer: data });
});

// DELETE /api/volunteers/:eventId/:studentId
volunteersRouter.delete('/:eventId/:studentId', authMiddleware, requireRole('coordinator'), async (req, res) => {
  const { data: evt } = await supabase.from('events').select('coordinator_id').eq('id', req.params.eventId).single();
  if (evt?.coordinator_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });

  await supabase.from('volunteers').delete()
    .eq('event_id', req.params.eventId).eq('student_id', req.params.studentId);
  res.json({ message: 'Volunteer removed' });
});

// ── Notifications ─────────────────────────────────────────
const notificationsRouter = express.Router();

// GET /api/notifications
notificationsRouter.get('/', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ notifications: data });
});

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', authMiddleware, async (req, res) => {
  await supabase.from('notifications').update({ is_read: true })
    .eq('user_id', req.user.id).eq('is_read', false);
  res.json({ message: 'All notifications marked read' });
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', authMiddleware, async (req, res) => {
  await supabase.from('notifications').update({ is_read: true })
    .eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ message: 'Notification marked read' });
});

// ── Feedback ──────────────────────────────────────────────
const feedbackRouter = express.Router();

// POST /api/feedback
feedbackRouter.post('/', authMiddleware, requireRole('faculty'), async (req, res) => {
  const { event_id, rating, comment } = req.body;
  if (!event_id || !rating) return res.status(400).json({ error: 'event_id and rating are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  const { data: evt } = await supabase.from('events').select('title, dept, coordinator_id').eq('id', event_id).single();
  if (!evt) return res.status(404).json({ error: 'Event not found' });
  if (evt.dept !== req.user.dept) return res.status(403).json({ error: 'Event is not in your department' });

  const { data, error } = await supabase
    .from('feedback')
    .insert({ event_id, faculty_id: req.user.id, rating, comment })
    .select().single();

  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ error: error.message });

  await notify(evt.coordinator_id, `New feedback received for "${evt.title}" — ${rating}/5 stars.`, 'info');
  res.status(201).json({ feedback: data });
});

// GET /api/feedback/:eventId
feedbackRouter.get('/:eventId', authMiddleware, requireRole('coordinator', 'faculty'), async (req, res) => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*, faculty:users!faculty_id(id, name, avatar, dept)')
    .eq('event_id', req.params.eventId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ feedback: data });
});

// ── Certificates ──────────────────────────────────────────
const certificatesRouter = express.Router();

// GET /api/certificates/:eventId — student fetches their own certificate data
certificatesRouter.get('/:eventId', authMiddleware, requireRole('student'), async (req, res) => {
  const { data: reg } = await supabase
    .from('registrations')
    .select('attended')
    .eq('event_id', req.params.eventId)
    .eq('student_id', req.user.id)
    .eq('status', 'approved')
    .single();

  if (!reg || !reg.attended)
    return res.status(404).json({ error: 'Certificate not available. Attendance must be verified first.' });

  const { data: evt } = await supabase
    .from('events').select('title, date, dept').eq('id', req.params.eventId).single();

  res.json({
    certificate: {
      studentName: req.user.name,
      eventTitle: evt.title,
      date: evt.date,
      dept: evt.dept,
      issuedAt: new Date().toISOString(),
    }
  });
});

// GET /api/certificates/my — all certificates for student
certificatesRouter.get('/', authMiddleware, requireRole('student'), async (req, res) => {
  const { data, error } = await supabase
    .from('registrations')
    .select('event_id, event:events(id, title, date, dept)')
    .eq('student_id', req.user.id)
    .eq('status', 'approved')
    .eq('attended', true);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ certificates: data });
});

module.exports = { volunteersRouter, notificationsRouter, feedbackRouter, certificatesRouter };
