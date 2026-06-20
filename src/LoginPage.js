import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { register as apiRegister } from './api';

const ROLE_COLORS = { student: '#534AB7', coordinator: '#0F6E56', faculty: '#854F0B' };

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form
  const [email, setEmail] = useState('ananya@college.edu');
  const [password, setPassword] = useState('demo1234');

  // Register form
  const [reg, setReg] = useState({ name: '', email: '', password: '', role: 'student', dept: 'CSE' });
  const setR = k => v => setReg(r => ({ ...r, [k]: v }));

  const demoAccounts = [
    { name: 'Ananya Krishnan', email: 'ananya@college.edu', role: 'student',     dept: 'CSE', avatar: 'AK' },
    { name: 'Rahul Selvam',    email: 'rahul@college.edu',  role: 'student',     dept: 'ECE', avatar: 'RS' },
    { name: 'Karthik Rajan',   email: 'karthik@college.edu',role: 'coordinator', dept: 'CSE', avatar: 'KR' },
    { name: 'Divya Menon',     email: 'divya@college.edu',  role: 'coordinator', dept: 'ECE', avatar: 'DM' },
    { name: 'Dr. Suresh Kumar',email: 'suresh@college.edu', role: 'faculty',     dept: 'CSE', avatar: 'SK' },
    { name: 'Dr. Meera Pillai',email: 'meera@college.edu',  role: 'faculty',     dept: 'ECE', avatar: 'MP' },
  ];

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await apiRegister(reg);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 12 };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1917', marginBottom: 4 }}>EXP-03 EventHub</h1>
          <p style={{ fontSize: 14, color: '#6b6963' }}>College Event Management System</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex: 1, padding: '13px', border: 'none', background: mode === m ? '#fff' : '#f9f8f5', fontWeight: mode === m ? 600 : 400, fontSize: 13, color: mode === m ? '#1a1917' : '#9b9890', borderBottom: mode === m ? '2px solid #534AB7' : '2px solid transparent', cursor: 'pointer' }}>
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {mode === 'login' ? (
              <form onSubmit={handleLogin}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@college.edu" />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />

                {error && <div style={{ color: '#A32D2D', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#FCEBEB', borderRadius: 8 }}>{error}</div>}

                <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#534AB7', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', marginBottom: 16 }}>
                  {loading ? 'Signing in…' : 'Sign in →'}
                </button>

                {/* Demo accounts */}
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 16 }}>
                  <p style={{ fontSize: 11, color: '#b0aea8', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Demo accounts (password: demo1234)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {demoAccounts.map(u => (
                      <button key={u.email} type="button" onClick={() => { setEmail(u.email); setPassword('demo1234'); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, background: '#fafafa', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: ROLE_COLORS[u.role], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{u.avatar}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1917' }}>{u.name.split(' ')[0]}</div>
                          <div style={{ fontSize: 10, color: '#9b9890', textTransform: 'capitalize' }}>{u.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full name *</label>
                <input value={reg.name} onChange={e => setR('name')(e.target.value)} style={inputStyle} placeholder="Your full name" required />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email *</label>
                <input type="email" value={reg.email} onChange={e => setR('email')(e.target.value)} style={inputStyle} placeholder="you@college.edu" required />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password *</label>
                <input type="password" value={reg.password} onChange={e => setR('password')(e.target.value)} style={inputStyle} placeholder="Min 6 characters" required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                    <select value={reg.role} onChange={e => setR('role')(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                      <option value="student">Student</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                    <select value={reg.dept} onChange={e => setR('dept')(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                      {['CSE','ECE','MECH','CIVIL','IT'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                {error && <div style={{ color: '#A32D2D', fontSize: 13, margin: '8px 0 12px', padding: '8px 12px', background: '#FCEBEB', borderRadius: 8 }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#534AB7', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', marginTop: 12 }}>
                  {loading ? 'Creating account…' : 'Create account →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
