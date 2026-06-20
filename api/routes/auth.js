const express = require('express');
const bcrypt  = require('bcryptjs');
const supabase = require('../db/supabase');
const { signToken, authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role, dept } = req.body;
  if (!name || !email || !password || !role || !dept)
    return res.status(400).json({ error: 'All fields are required' });
  if (!['student', 'coordinator', 'faculty'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const avatar = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, password: hashedPassword, role, dept, avatar })
    .select('id, name, email, role, dept, avatar')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const { password: _, ...safeUser } = user;
  res.json({ token: signToken(safeUser), user: safeUser });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users').select('id, name, email, role, dept, avatar').eq('id', req.user.id).single();
  if (error) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// GET /api/auth/users?role=student  — for volunteer selector
router.get('/users', authMiddleware, requireRole('coordinator', 'faculty'), async (req, res) => {
  const { role, dept } = req.query;
  let query = supabase.from('users').select('id, name, email, dept, avatar, role');
  if (role) query = query.eq('role', role);
  if (dept) query = query.eq('dept', dept);
  const { data, error } = await query.order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

module.exports = router;
