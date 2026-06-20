import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Shell, PageHeader, Card, Badge, StatusBadge, Btn, Modal, EmptyState, StatCard, useToast, Spinner } from './ui';
import * as api from './api';

const ACCENT = '#534AB7';

export default function StudentApp() {
  const [page, setPage] = useState('discover');
  const { user } = useAuth();
  const { show: showToast, ToastEl } = useToast();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.getMyRegistrations()
      .then(r => setPendingCount((r.data.registrations || []).filter(x => x.status === 'pending_approval').length))
      .catch(() => {});
  }, [page]);

  const nav = [
    { id: 'discover', label: 'Discover Events',  icon: '🔍', active: page === 'discover', onClick: () => setPage('discover') },
    { id: 'history',  label: 'My Registrations', icon: '📅', active: page === 'history',  onClick: () => setPage('history'), badge: pendingCount },
    { id: 'certs',    label: 'Certificates',      icon: '🏅', active: page === 'certs',    onClick: () => setPage('certs') },
  ];

  return (
    <Shell nav={nav}>
      {page === 'discover' && <DiscoverPage showToast={showToast} />}
      {page === 'history'  && <HistoryPage  showToast={showToast} />}
      {page === 'certs'    && <CertsPage    showToast={showToast} />}
      {ToastEl}
    </Shell>
  );
}

function DiscoverPage({ showToast }) {
  const { user } = useAuth();
  const [events, setEvents]     = useState([]);
  const [myRegs, setMyRegs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getEvents(), api.getMyRegistrations()])
      .then(([evRes, regRes]) => {
        setEvents(evRes.data.events || []);
        setMyRegs(regRes.data.registrations || []);
      })
      .catch(() => showToast('Failed to load events', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const categories = ['all', ...new Set(events.map(e => e.category))];
  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter);

  const handleRegister = async (evt) => {
    try {
      await api.registerForEvent(evt.id);
      showToast('Registered! Awaiting faculty approval.', 'success');
      load();
      setSelected(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    }
  };

  const handleCancel = async (eventId) => {
    try {
      await api.cancelRegistration(eventId);
      showToast('Registration cancelled.', 'info');
      load();
      setSelected(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not cancel', 'error');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Discover Events" subtitle="Browse and register for upcoming college events" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard value={events.length}  label="Total events"     accent={ACCENT} />
        <StatCard value={events.filter(e => e.status === 'upcoming').length} label="Upcoming" accent="#185FA5" />
        <StatCard value={myRegs.length}  label="My registrations" accent="#0F6E56" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${filter === c ? ACCENT : 'rgba(0,0,0,0.12)'}`, background: filter === c ? ACCENT : '#fff', color: filter === c ? '#fff' : '#6b6963', cursor: 'pointer' }}>
            {c === 'all' ? 'All events' : c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {filtered.map(evt => {
          const reg = myRegs.find(r => r.event_id === evt.id);
          return <EventCard key={evt.id} event={evt} registration={reg} onClick={() => setSelected({ evt, reg })} accent={ACCENT} />;
        })}
      </div>
      {filtered.length === 0 && <EmptyState icon="📭" title="No events" subtitle="Try a different filter" />}

      {selected && (
        <EventDetailModal event={selected.evt} registration={selected.reg}
          onClose={() => setSelected(null)}
          onRegister={() => handleRegister(selected.evt)}
          onCancel={() => handleCancel(selected.evt.id)}
          accent={ACCENT} />
      )}
    </div>
  );
}

function EventCard({ event, registration, onClick, accent }) {
  const catColor = { Technical: '#534AB7', Cultural: '#D85A30', Workshop: '#0F6E56', Sports: '#854F0B', General: '#185FA5' };
  const catBg    = { Technical: '#EEEDFE', Cultural: '#FAECE7', Workshop: '#E1F5EE', Sports: '#FAEEDA', General: '#E6F1FB' };
  const c = catColor[event.category] || '#6b6963';
  const bg = catBg[event.category] || '#f5f4f0';
  const pct = Math.min(100, Math.round(((event.registration_count || 0) / event.capacity) * 100));

  return (
    <Card style={{ padding: 18, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <Badge label={event.category} color={c} bg={bg} />
        {registration ? <StatusBadge status={registration.status} /> : <StatusBadge status={event.status} />}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1917', marginBottom: 8, lineHeight: 1.3 }}>{event.title}</h3>
      <div style={{ fontSize: 12, color: '#9b9890', marginBottom: 2 }}>📅 {event.date} · ⏰ {event.time}</div>
      <div style={{ fontSize: 12, color: '#9b9890', marginBottom: 12 }}>📍 {event.venue}</div>
      <div style={{ height: 4, background: '#f0ede6', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#E24B4A' : accent, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11, color: '#9b9890' }}>{event.registration_count || 0}/{event.capacity} registered</div>
    </Card>
  );
}

function EventDetailModal({ event, registration, onClose, onRegister, onCancel, accent }) {
  const full = (event.registration_count || 0) >= event.capacity;
  const canRegister = event.status === 'upcoming' && !registration && !full;
  return (
    <Modal title={event.title} onClose={onClose} width={520}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <StatusBadge status={event.status} />
        {registration && <StatusBadge status={registration.status} />}
      </div>
      <p style={{ fontSize: 14, color: '#6b6963', lineHeight: 1.6, marginBottom: 16 }}>{event.description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[['📅 Date', event.date], ['⏰ Time', event.time], ['📍 Venue', event.venue], ['🏛️ Dept', event.dept], ['👥 Capacity', `${event.registration_count || 0}/${event.capacity}`], ['📂 Category', event.category]].map(([k, v]) => (
          <div key={k} style={{ padding: '10px 12px', background: '#f9f8f5', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#9b9890', marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1917' }}>{v}</div>
          </div>
        ))}
      </div>
      {Array.isArray(event.schedule) && event.schedule.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6963', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Schedule</div>
          {event.schedule.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#6b6963', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ minWidth: 50, fontWeight: 500, color: '#1a1917' }}>{s.time}</span><span>{s.activity}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        {canRegister && <Btn onClick={onRegister} accent={accent}>Register →</Btn>}
        {registration?.status === 'pending_approval' && <Btn onClick={onCancel} variant="danger">Cancel</Btn>}
        {registration?.status === 'approved' && <span style={{ fontSize: 13, color: '#0F6E56', fontWeight: 600, padding: '9px 0' }}>✓ You are registered</span>}
        {full && !registration && <span style={{ fontSize: 13, color: '#A32D2D', fontWeight: 600, padding: '9px 0' }}>Event is full</span>}
        <Btn onClick={onClose} variant="secondary" style={{ marginLeft: 'auto' }}>Close</Btn>
      </div>
    </Modal>
  );
}

function HistoryPage({ showToast }) {
  const [regs, setRegs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const load = useCallback(() => {
    api.getMyRegistrations()
      .then(r => setRegs(r.data.registrations || []))
      .catch(() => showToast('Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (eventId) => {
    try {
      await api.cancelRegistration(eventId);
      showToast('Cancelled', 'info');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Cannot cancel', 'error');
    }
  };

  const filtered = filter === 'all' ? regs : regs.filter(r => r.status === filter);

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="My Registrations" subtitle="Track your event registrations and approvals" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'pending_approval', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${filter === s ? ACCENT : 'rgba(0,0,0,0.12)'}`, background: filter === s ? ACCENT : '#fff', color: filter === s ? '#fff' : '#6b6963', cursor: 'pointer' }}>
            {s === 'all' ? 'All' : s === 'pending_approval' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon="📋" title="No registrations" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(r => (
          <Card key={r.id} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1917', marginBottom: 2 }}>{r.event?.title}</div>
                <div style={{ fontSize: 12, color: '#9b9890' }}>📅 {r.event?.date} · 📍 {r.event?.venue}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusBadge status={r.status} />
                {r.attended && <Badge label="Attended ✓" color="#0F6E56" bg="#E1F5EE" />}
                {r.status === 'pending_approval' && <Btn onClick={() => handleCancel(r.event_id)} variant="danger" small>Cancel</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CertsPage({ showToast }) {
  const { user } = useAuth();
  const [certs, setCerts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyCertificates()
      .then(r => setCerts(r.data.certificates || []))
      .catch(() => showToast('Failed to load certificates', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleDownload = async (cert) => {
    try {
      const res = await api.getCertificate(cert.event_id);
      const { certificate: c } = res.data;
      const html = `<!DOCTYPE html><html><head><title>Certificate</title><style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9f8f5}.cert{background:#fff;border:8px solid #534AB7;border-radius:4px;padding:48px 60px;width:700px;text-align:center}.title{font-size:28px;color:#534AB7;font-weight:bold;letter-spacing:2px;margin-bottom:4px}.sub{font-size:13px;color:#9b9890;text-transform:uppercase;letter-spacing:4px;margin-bottom:36px}.name{font-size:34px;color:#1a1917;font-weight:bold;border-bottom:2px solid #534AB7;display:inline-block;padding-bottom:4px;margin-bottom:24px}.event{font-size:20px;color:#1a1917;font-weight:bold;margin-bottom:24px}</style></head><body><div class="cert"><div class="title">CERTIFICATE</div><div class="sub">of Participation</div><div style="font-size:14px;color:#6b6963;margin-bottom:8px">This certifies that</div><div class="name">${c.studentName}</div><div style="font-size:14px;color:#6b6963;margin-bottom:8px">has successfully participated in</div><div class="event">${c.eventTitle}</div><div style="font-size:13px;color:#6b6963">${c.dept} Department · ${c.date}</div><div style="font-size:48px;margin-top:24px">🏛️</div></div></body></html>`;
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    } catch (err) {
      showToast(err.response?.data?.error || 'Certificate not available', 'error');
    }
  };

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="Certificates" subtitle="Download certificates for events you attended" />
      {certs.length === 0 && <EmptyState icon="🏅" title="No certificates yet" subtitle="Attend events to earn certificates" />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
        {certs.map(c => (
          <Card key={c.event_id} style={{ padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1917', marginBottom: 4 }}>{c.event?.title}</div>
            <div style={{ fontSize: 12, color: '#9b9890', marginBottom: 14 }}>{c.event?.date} · {c.event?.dept}</div>
            <Btn onClick={() => handleDownload(c)} accent={ACCENT}>⬇ Download Certificate</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}
