import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, markAllRead, markOneRead } from './api';

export const ROLE_ACCENT = { student: '#534AB7', coordinator: '#0F6E56', faculty: '#854F0B' };
export const ROLE_LIGHT  = { student: '#EEEDFE', coordinator: '#E1F5EE', faculty: '#FAEEDA' };

// ── Shell ─────────────────────────────────────────────────
export function Shell({ nav, children }) {
  const { user, logout } = useAuth();
  const accent = ROLE_ACCENT[user.role];
  const light  = ROLE_LIGHT[user.role];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      <aside style={{ width: 224, flexShrink: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b0aea8', marginBottom: 2 }}>EXP-03</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1917' }}>EventHub</div>
        </div>
        <div style={{ padding: '12px 18px 12px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{user.avatar || user.name?.slice(0,2).toUpperCase()}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name?.split(' ')[0]}</div>
            <div style={{ fontSize: 11, color: '#9b9890', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
        </div>
        <nav style={{ padding: '10px 0', flex: 1 }}>
          {nav.map(item => <NavItem key={item.id} item={item} accent={accent} light={light} />)}
        </nav>
        <button onClick={logout} style={{ margin: '0 12px 16px', padding: '9px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, background: 'none', color: '#9b9890', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>← Sign out</button>
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar accent={accent} />
        <div style={{ flex: 1, padding: '28px 36px' }}>{children}</div>
      </main>
    </div>
  );
}

function NavItem({ item, accent, light }) {
  const active = item.active;
  return (
    <button onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 18px', border: 'none', background: active ? light : 'none', color: active ? accent : '#6b6963', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'left', borderLeft: active ? `3px solid ${accent}` : '3px solid transparent' }}>
      <span style={{ fontSize: 15 }}>{item.icon}</span>
      <span>{item.label}</span>
      {item.badge > 0 && <span style={{ marginLeft: 'auto', background: accent, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{item.badge}</span>}
    </button>
  );
}

function TopBar({ accent }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [notifs, setNotifs] = useState([]);

  const load = useCallback(() => {
    getNotifications().then(r => setNotifs(r.data.notifications || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (show) load(); }, [show, load]);

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: '12px 36px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff', display: 'flex', justifyContent: 'flex-end', position: 'relative', gap: 10 }}>
      <button onClick={() => setShow(v => !v)} style={{ position: 'relative', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, color: '#6b6963' }}>
        🔔 {unread > 0 && <span style={{ background: accent, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{unread}</span>}
      </button>
      {show && (
        <div style={{ position: 'absolute', top: '100%', right: 36, marginTop: 4, width: 340, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
            {unread > 0 && <button onClick={() => markAllRead().then(load)} style={{ fontSize: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifs.length === 0 && <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9b9890', fontSize: 13 }}>No notifications</div>}
            {notifs.map(n => (
              <div key={n.id} onClick={() => markOneRead(n.id).then(load)} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: n.is_read ? '#fff' : '#f9f8f5', cursor: 'pointer', display: 'flex', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : accent, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 13, color: '#1a1917', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#b0aea8', marginTop: 2 }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Utility components ────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1917', marginBottom: 2 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 14, color: '#6b6963' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 12, ...style }}>{children}</div>;
}

export function Badge({ label, color, bg }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, color, background: bg }}>{label}</span>;
}

export function StatusBadge({ status }) {
  const map = { pending_approval: ['Pending', '#854F0B', '#FAEEDA'], approved: ['Approved', '#0F6E56', '#E1F5EE'], rejected: ['Rejected', '#A32D2D', '#FCEBEB'], upcoming: ['Upcoming', '#185FA5', '#E6F1FB'], completed: ['Completed', '#3B6D11', '#EAF3DE'] };
  const [label, color, bg] = map[status] || [status, '#6b6963', '#f5f4f0'];
  return <Badge label={label} color={color} bg={bg} />;
}

export function Btn({ children, onClick, variant = 'primary', accent = '#534AB7', disabled = false, small = false, style: ext = {}, type = 'button' }) {
  const base = { padding: small ? '6px 14px' : '9px 18px', borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', opacity: disabled ? 0.5 : 1, ...ext };
  if (variant === 'danger')     return <button type={type} onClick={!disabled ? onClick : undefined} style={{ ...base, background: '#A32D2D', color: '#fff' }}>{children}</button>;
  if (variant === 'secondary')  return <button type={type} onClick={!disabled ? onClick : undefined} style={{ ...base, background: '#fff', color: '#1a1917', border: '1px solid rgba(0,0,0,0.12)' }}>{children}</button>;
  return <button type={type} onClick={!disabled ? onClick : undefined} style={{ ...base, background: accent, color: '#fff' }}>{children}</button>;
}

export function Modal({ title, children, onClose, width = 480 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 14, width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1917' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9b9890' }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b6963', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}{required && ' *'}</label>}
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, fontSize: 14, color: '#1a1917', background: '#fff', outline: 'none' };
export function Input({ label, value, onChange, type = 'text', placeholder, required }) {
  return <Field label={label} required={required}><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} /></Field>;
}
export function Select({ label, value, onChange, options }) {
  return <Field label={label}><select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>;
}
export function Textarea({ label, value, onChange, rows = 3, placeholder }) {
  return <Field label={label}><textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...inputStyle, resize: 'vertical' }} /></Field>;
}
export function EmptyState({ icon, title, subtitle }) {
  return <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9b9890' }}><div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div><div style={{ fontSize: 16, fontWeight: 600, color: '#6b6963', marginBottom: 6 }}>{title}</div>{subtitle && <div style={{ fontSize: 14 }}>{subtitle}</div>}</div>;
}
export function StatCard({ value, label, accent }) {
  return <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: accent || '#1a1917' }}>{value}</div><div style={{ fontSize: 12, color: '#9b9890', marginTop: 3 }}>{label}</div></div>;
}

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const c = { success: ['#E1F5EE','#0F6E56','#5DCAA5'], error: ['#FCEBEB','#A32D2D','#F09595'], info: ['#E6F1FB','#185FA5','#85B7EB'] }[type] || ['#E6F1FB','#185FA5','#85B7EB'];
  return <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, background: c[0], color: c[1], border: `1px solid ${c[2]}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 500, maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>{message}</div>;
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const hide = useCallback(() => setToast(null), []);
  const ToastEl = toast ? <Toast message={toast.message} type={toast.type} onClose={hide} /> : null;
  return { show, ToastEl };
}

export function Spinner() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}><div style={{ width: 32, height: 32, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#534AB7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
}
