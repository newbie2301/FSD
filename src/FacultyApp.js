import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Shell, PageHeader, Card, Badge, StatusBadge, Btn, Modal, Textarea, EmptyState, StatCard, useToast, Spinner } from './ui';
import * as api from './api';

const ACCENT = '#854F0B';

export default function FacultyApp() {
  const [page, setPage] = useState('approvals');
  const { show: showToast, ToastEl } = useToast();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.getPendingApprovals().then(r => setPendingCount((r.data.registrations || []).length)).catch(() => {});
  }, [page]);

  const nav = [
    { id: 'approvals',  label: 'Approvals',        icon: '✅', active: page === 'approvals',  onClick: () => setPage('approvals'), badge: pendingCount },
    { id: 'monitor',    label: 'Dept Events',       icon: '📊', active: page === 'monitor',    onClick: () => setPage('monitor') },
    { id: 'attendance', label: 'Verify Attendance', icon: '🎫', active: page === 'attendance', onClick: () => setPage('attendance') },
    { id: 'feedback',   label: 'Submit Feedback',   icon: '💬', active: page === 'feedback',   onClick: () => setPage('feedback') },
  ];

  return (
    <Shell nav={nav}>
      {page === 'approvals'  && <ApprovalsPage  showToast={showToast} />}
      {page === 'monitor'    && <MonitorPage    showToast={showToast} />}
      {page === 'attendance' && <AttendancePage showToast={showToast} />}
      {page === 'feedback'   && <FeedbackPage   showToast={showToast} />}
      {ToastEl}
    </Shell>
  );
}

function ApprovalsPage({ showToast }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    api.getPendingApprovals()
      .then(r => setPending(r.data.registrations || []))
      .catch(() => showToast('Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try { await api.approveRegistration(id); showToast('Approved! Student notified.', 'success'); load(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleReject = async () => {
    try { await api.rejectRegistration(rejectModal.id, reason); showToast('Rejected. Student notified.', 'info'); setRejectModal(null); setReason(''); load(); }
    catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  if (loading) return <Spinner />;
  return (
    <div>
      <PageHeader title="Participation Approvals" subtitle="Review and approve student registration requests for your department" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard value={pending.length} label="Awaiting approval" accent={ACCENT} />
      </div>
      {pending.length === 0 && <EmptyState icon="✅" title="All caught up!" subtitle="No pending approvals" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pending.map(r => (
          <Card key={r.id} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ACCENT, flexShrink: 0 }}>{r.student?.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1917', marginBottom: 2 }}>{r.student?.name}</div>
                <div style={{ fontSize: 12, color: '#9b9890', marginBottom: 6 }}>{r.student?.dept} · {r.student?.email}</div>
                <div style={{ fontSize: 13, color: '#6b6963' }}>Requesting to attend: <strong style={{ color: '#1a1917' }}>{r.event?.title}</strong></div>
                <div style={{ fontSize: 12, color: '#9b9890', marginTop: 2 }}>📅 {r.event?.date} · 📍 {r.event?.venue}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => handleApprove(r.id)} accent="#0F6E56" small>✓ Approve</Btn>
                <Btn onClick={() => setRejectModal(r)} variant="danger" small>✕ Reject</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {rejectModal && (
        <Modal title="Reject Registration" onClose={() => setRejectModal(null)}>
          <p style={{ fontSize: 14, color: '#6b6963', marginBottom: 14 }}>Rejecting <strong>{rejectModal.student?.name}</strong>'s request for <strong>{rejectModal.event?.title}</strong>.</p>
          <Textarea label="Reason (optional)" value={reason} onChange={setReason} rows={3} placeholder="e.g. Clashes with mid-semester exam" />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn onClick={handleReject} variant="danger">Confirm rejection</Btn>
            <Btn onClick={() => setRejectModal(null)} variant="secondary">Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MonitorPage({ showToast }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getEvents({ dept: user.dept })
      .then(r => setEvents(r.data.events || []))
      .catch(() => showToast('Failed', 'error'))
      .finally(() => setLoading(false));
  }, [showToast, user.dept]);

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter);
  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Department Events" subtitle={`Monitoring events from ${user.dept}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard value={events.length} label="Total" accent={ACCENT} />
        <StatCard value={events.filter(e => e.status === 'upcoming').length} label="Upcoming" accent="#185FA5" />
        <StatCard value={events.filter(e => e.status === 'completed').length} label="Completed" accent="#3B6D11" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all','upcoming','completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${filter === s ? ACCENT : 'rgba(0,0,0,0.12)'}`, background: filter === s ? ACCENT : '#fff', color: filter === s ? '#fff' : '#6b6963' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState icon="📊" title="No events" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(evt => (
          <Card key={evt.id} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1917' }}>{evt.title}</span>
                  <StatusBadge status={evt.status} />
                  <Badge label={evt.category} color="#6b6963" bg="#f5f4f0" />
                </div>
                <div style={{ fontSize: 12, color: '#9b9890' }}>📅 {evt.date} · 📍 {evt.venue} · Capacity: {evt.registration_count || 0}/{evt.capacity}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AttendancePage({ showToast }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [list, setList] = useState([]);

  useEffect(() => {
    api.getEvents({ dept: user.dept, status: 'completed' })
      .then(r => { const evts = r.data.events || []; setEvents(evts); if (evts.length) setSelected(evts[0].id); });
  }, [user.dept]);

  const loadList = useCallback(() => {
    if (selected) api.getAttendance(selected).then(r => setList(r.data.attendance || []));
  }, [selected]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleVerify = async (studentId, attended) => {
    try {
      await api.markAttendance(selected, studentId, attended);
      showToast(attended ? 'Verified — certificate issued!' : 'Reversed', attended ? 'success' : 'info');
      loadList();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <div>
      <PageHeader title="Verify Attendance" subtitle="Verify student attendance to grant credit and certificates" />
      {events.length === 0 && <EmptyState icon="🎫" title="No completed events" subtitle="Only completed events need attendance verification" />}
      {events.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {events.map(e => <button key={e.id} onClick={() => setSelected(e.id)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${selected === e.id ? ACCENT : 'rgba(0,0,0,0.12)'}`, background: selected === e.id ? ACCENT : '#fff', color: selected === e.id ? '#fff' : '#6b6963' }}>{e.title}</button>)}
          </div>
          <Card>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontSize: 13, fontWeight: 600 }}>{list.filter(r => r.attended).length}/{list.length} verified</div>
            {list.length === 0 && <EmptyState icon="👥" title="No approved registrations" />}
            {list.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.attended ? '#E1F5EE' : '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: r.attended ? '#0F6E56' : '#6b6963' }}>{r.student?.avatar}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{r.student?.name}</div><div style={{ fontSize: 12, color: '#9b9890' }}>{r.student?.dept}</div></div>
                {r.attended ? <Badge label="Verified ✓" color="#0F6E56" bg="#E1F5EE" /> : <Badge label="Not verified" color="#6b6963" bg="#f5f4f0" />}
                <Btn onClick={() => handleVerify(r.student_id, !r.attended)} accent={r.attended ? '#A32D2D' : ACCENT} small>{r.attended ? 'Reverse' : 'Verify'}</Btn>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function FeedbackPage({ showToast }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [allFeedback, setAllFeedback] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getEvents({ dept: user.dept, status: 'completed' })
      .then(r => { const evts = r.data.events || []; setEvents(evts); if (evts.length) setSelected(evts[0].id); });
  }, [user.dept]);

  useEffect(() => {
    if (selected) api.getEventFeedback(selected).then(r => setAllFeedback(r.data.feedback || []));
  }, [selected]);

  const myFeedback = allFeedback.find(f => f.faculty_id === user.id);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.submitFeedback(selected, rating, comment);
      showToast('Feedback submitted!', 'success');
      api.getEventFeedback(selected).then(r => setAllFeedback(r.data.feedback || []));
      setComment(''); setRating(4);
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Event Feedback" subtitle="Submit quality feedback to help coordinators improve" />
      {events.length === 0 && <EmptyState icon="💬" title="No completed events" subtitle="Feedback is available after events complete" />}
      {events.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {events.map(e => <button key={e.id} onClick={() => setSelected(e.id)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${selected === e.id ? ACCENT : 'rgba(0,0,0,0.12)'}`, background: selected === e.id ? ACCENT : '#fff', color: selected === e.id ? '#fff' : '#6b6963' }}>{e.title}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ padding: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6963', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>{myFeedback ? 'Your feedback' : 'Submit feedback'}</div>
              {myFeedback ? (
                <div>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 20 }}>{s <= myFeedback.rating ? '⭐' : '☆'}</span>)}</div>
                  <p style={{ fontSize: 14, color: '#6b6963', lineHeight: 1.6 }}>{myFeedback.comment}</p>
                  <div style={{ fontSize: 12, color: '#b0aea8', marginTop: 8 }}>Submitted {new Date(myFeedback.submitted_at).toLocaleDateString()}</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6963', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Rating</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4,5].map(s => <button key={s} onClick={() => setRating(s)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>{s <= rating ? '⭐' : '☆'}</button>)}
                      <span style={{ fontSize: 13, color: '#6b6963', alignSelf: 'center', marginLeft: 6 }}>{rating}/5</span>
                    </div>
                  </div>
                  <Textarea label="Comments" value={comment} onChange={setComment} rows={4} placeholder="Share your observations on event quality, organisation, student engagement…" />
                  <Btn onClick={handleSubmit} accent={ACCENT} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit feedback'}</Btn>
                </>
              )}
            </Card>
            <Card style={{ padding: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6963', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>All Feedback ({allFeedback.length})</div>
              {allFeedback.length === 0 && <EmptyState icon="💬" title="No feedback yet" />}
              {allFeedback.map(fb => (
                <div key={fb.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: ACCENT }}>{fb.faculty?.avatar}</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fb.faculty?.name}</span>
                    <span>{'⭐'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#6b6963', lineHeight: 1.5 }}>{fb.comment}</p>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
