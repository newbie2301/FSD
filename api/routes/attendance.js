const express = require('express');
const supabase = require('../db/supabase');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { notify } = require('../middleware/notify');

const router = express.Router();

// ── GET /api/attendance/:eventId ──────────────────────────
// Coordinator or Faculty: get approved registrations with attendance
router.get('/:eventId', authMiddleware, requireRole('coordinator', 'faculty'), async (req, res) => {
  const { data, error } = await supabase
    .from('registrations')
    .select('*, student:users!student_id(id, name, email, dept, avatar)')
    .eq('event_id', req.params.eventId)
    .eq('status', 'approved')
    .order('registered_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ attendance: data });
});

// ── PATCH /api/attendance/:eventId/:studentId ─────────────
// Coordinator marks attendance; Faculty verifies it
router.patch('/:eventId/:studentId', authMiddleware, requireRole('coordinator', 'faculty'), async (req, res) => {
  const { attended } = req.body;
  if (typeof attended !== 'boolean')
    return res.status(400).json({ error: 'attended must be a boolean' });

  const { data: evt } = await supabase
    .from('events').select('title, coordinator_id, dept').eq('id', req.params.eventId).single();
  if (!evt) return res.status(404).json({ error: 'Event not found' });

  // Coordinator can only mark their own events; faculty must be same dept
  if (req.user.role === 'coordinator' && evt.coordinator_id !== req.user.id)
    return res.status(403).json({ error: 'Not your event' });
  if (req.user.role === 'faculty' && evt.dept !== req.user.dept)
    return res.status(403).json({ error: 'Event is not in your department' });

  const { data: updated, error } = await supabase
    .from('registrations')
    .update({ attended })
    .eq('event_id', req.params.eventId)
    .eq('student_id', req.params.studentId)
    .eq('status', 'approved')
    .select()
    .single();

  if (error || !updated) return res.status(404).json({ error: 'Approved registration not found' });

  if (attended) {
    await notify(
      req.params.studentId,
      `Your attendance for "${evt.title}" has been verified. Your certificate is ready! 🏅`,
      'success'
    );
  }

  res.json({ registration: updated });
});

// ── GET /api/attendance/:eventId/export ───────────────────
// Returns CSV string — coordinator only
router.get('/:eventId/export', authMiddleware, requireRole('coordinator', 'faculty'), async (req, res) => {
  const { data: evt } = await supabase
    .from('events').select('title').eq('id', req.params.eventId).single();

  const { data, error } = await supabase
    .from('registrations')
    .select('attended, student:users!student_id(name, email, dept)')
    .eq('event_id', req.params.eventId)
    .eq('status', 'approved');

  if (error) return res.status(500).json({ error: error.message });

  const rows = [['Name', 'Email', 'Department', 'Attended']];
  (data || []).forEach(r => {
    rows.push([r.student.name, r.student.email, r.student.dept, r.attended ? 'Yes' : 'No']);
  });

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${evt?.title || req.params.eventId}.csv"`);
  res.send(csv);
});

module.exports = router;
