import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Shell, PageHeader, Card, Badge, StatusBadge, Btn, Modal, Input, Select, Textarea, EmptyState, StatCard, useToast, Spinner } from './ui';
import * as api from './api';

const ACCENT = '#0F6E56';

export default function CoordinatorApp() {
  const [page, setPage] = useState('events');
  const { show: showToast, ToastEl } = useToast();

  const nav = [
    { id: 'events',      label: 'My Events',     icon: '📋', active: page === 'events',      onClick: () => setPage('events') },
    { id: 'create',      label: 'Create Event',  icon: '➕', active: page === 'create',      onClick: () => setPage('create') },
    { id: 'registrants', label: 'Registrations', icon: '👥', active: page === 'registrants', onClick: () => setPage('registrants') },
    { id: 'attendance',  label: 'Attendance',    icon: '✅', active: page === 'attendance',  onClick: () => setPage('attendance') },
    { id: 'volunteers',  label: 'Volunteers',    icon: '🙋', active: page === 'volunteers',  onClick: () => setPage('volunteers') },
  ];

  return (
    <Shell nav={nav}>
      {page === 'events'      && <EventsPage      showToast={showToast} />}
      {page === 'create'      && <CreateEventPage showToast={showToast} onCreated={() => setPage('events')} />}
      {page === 'registrants' && <RegistrantsPage showToast={showToast} />}
      {page === 'attendance'  && <AttendancePage  showToast={showToast} />}
      {page === 'volunteers'  && <VolunteersPage  showToast={showToast} />}
      {ToastEl}
    </Shell>
  );
}

// ── Events Page ───────────────────────────────────────────
function EventsPage({ showToast }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [scheduleEvt, setScheduleEvt] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getEvents()
      .then(r => setEvents(r.data.events || []))
      .catch(() => showToast('Failed to load events', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async (evt) => {
    try {
      await api.publishEvent(evt.id, !evt.published);
      showToast(evt.published ? 'Event unpublished' : 'Published! Students can now register.', evt.published ? 'info' : 'success');
      load();
    } catch { showToast('Action failed', 'error'); }
  };

  if (loading) return <Spinner />;

  const stats = { total: events.length, published: events.filter(e=>e.published).length, upcoming: events.filter(e=>e.status==='upcoming').length, completed: events.filter(e=>e.status==='completed').length };

  return (
    <div>
      <PageHeader title="My Events" subtitle="Manage your events, schedules and capacity" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        <StatCard value={stats.total}     label="Total"     accent={ACCENT} />
        <StatCard value={stats.published} label="Published" accent="#185FA5" />
        <StatCard value={stats.upcoming}  label="Upcoming"  accent="#854F0B" />
        <StatCard value={stats.completed} label="Completed" accent="#3B6D11" />
      </div>

      {events.length === 0 && <EmptyState icon="📋" title="No events yet" subtitle="Create your first event using the sidebar" />}

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {events.map(evt => {
          const pct = Math.min(100, Math.round(((evt.registration_count||0)/evt.capacity)*100));
          return (
            <Card key={evt.id} style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, marginBottom:6, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#1a1917' }}>{evt.title}</span>
                    <StatusBadge status={evt.status} />
                    {evt.published
                      ? <Badge label="Published" color="#0F6E56" bg="#E1F5EE" />
                      : <Badge label="Draft"     color="#6b6963" bg="#f5f4f0" />}
                  </div>
                  <div style={{ fontSize:12, color:'#9b9890', marginBottom:8 }}>
                    📅 {evt.date} · ⏰ {evt.time} · 📍 {evt.venue} · 👥 {evt.registration_count||0}/{evt.capacity}
                  </div>
                  <div style={{ width:200 }}>
                    <div style={{ height:4, background:'#f0ede6', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: pct>=90?'#E24B4A':ACCENT, borderRadius:4 }} />
                    </div>
                    <div style={{ fontSize:11, color:'#9b9890', marginTop:2 }}>{pct}% full</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <Btn onClick={() => setEditing(evt)}      variant="secondary" small>✏️ Edit</Btn>
                  <Btn onClick={() => setScheduleEvt(evt)}  variant="secondary" small>🗓 Schedule</Btn>
                  <Btn onClick={() => handlePublish(evt)}   accent={evt.published?'#854F0B':ACCENT} small>
                    {evt.published ? '⬇ Unpublish' : '⬆ Publish'}
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editing     && <EditEventModal     event={editing}     onClose={() => { setEditing(null);     load(); }} showToast={showToast} />}
      {scheduleEvt && <ScheduleModal      event={scheduleEvt} onClose={() => { setScheduleEvt(null); load(); }} showToast={showToast} />}
    </div>
  );
}

function EditEventModal({ event, onClose, showToast }) {
  const [form, setForm] = useState({
    title: event.title, date: event.date, time: event.time||'',
    venue: event.venue, description: event.description||'', capacity: event.capacity,
  });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await api.updateEvent(event.id, form);
      showToast('Event updated — registered students notified!', 'success');
      onClose();
    } catch (err) { showToast(err.response?.data?.error || 'Update failed', 'error'); }
  };

  return (
    <Modal title="Edit Event" onClose={onClose}>
      <Input label="Title"    value={form.title}       onChange={set('title')}    required />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Input label="Date"   value={form.date}        onChange={set('date')}     type="date" />
        <Input label="Time"   value={form.time}        onChange={set('time')}     type="time" />
      </div>
      <Input label="Venue"    value={form.venue}       onChange={set('venue')} />
      <Input label="Capacity" value={form.capacity}    onChange={v => set('capacity')(Number(v))} type="number" />
      <Textarea label="Description" value={form.description} onChange={set('description')} rows={3} />
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={save} accent={ACCENT}>Save changes</Btn>
        <Btn onClick={onClose} variant="secondary">Cancel</Btn>
      </div>
    </Modal>
  );
}

function ScheduleModal({ event, onClose, showToast }) {
  const [items, setItems] = useState(Array.isArray(event.schedule) ? event.schedule : []);
  const [t, setT]     = useState('');
  const [act, setAct] = useState('');

  const add  = () => { if (!t || !act) return; setItems(p => [...p, { time:t, activity:act }]); setT(''); setAct(''); };
  const remove = i => setItems(p => p.filter((_,j) => j!==i));

  const save = async () => {
    try {
      await api.updateSchedule(event.id, items);
      showToast('Schedule updated — attendees notified!', 'success');
      onClose();
    } catch { showToast('Failed to save schedule', 'error'); }
  };

  return (
    <Modal title={`Schedule — ${event.title}`} onClose={onClose}>
      <div style={{ marginBottom:14 }}>
        {items.length === 0 && <div style={{ fontSize:13, color:'#9b9890', padding:'10px 0' }}>No schedule items yet. Add one below.</div>}
        {items.map((s,i) => (
          <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ minWidth:52, fontWeight:600, fontSize:13, color:'#1a1917' }}>{s.time}</span>
            <span style={{ flex:1, fontSize:13, color:'#6b6963' }}>{s.activity}</span>
            <button onClick={() => remove(i)} style={{ background:'none', border:'none', color:'#A32D2D', cursor:'pointer', fontSize:14 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input type="time" value={t} onChange={e => setT(e.target.value)}
          style={{ padding:'8px 10px', border:'1px solid rgba(0,0,0,0.15)', borderRadius:8, fontSize:13, width:110 }} />
        <input type="text" value={act} onChange={e => setAct(e.target.value)} placeholder="Activity description"
          style={{ flex:1, padding:'8px 10px', border:'1px solid rgba(0,0,0,0.15)', borderRadius:8, fontSize:13 }} />
        <Btn onClick={add} accent={ACCENT} small>Add</Btn>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <Btn onClick={save} accent={ACCENT}>Save schedule</Btn>
        <Btn onClick={onClose} variant="secondary">Cancel</Btn>
      </div>
    </Modal>
  );
}

// ── Create Event ──────────────────────────────────────────
function CreateEventPage({ showToast, onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title:'', date:'', time:'', venue:'', description:'',
    capacity:50, category:'Technical', dept: user.dept,
  });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.title || !form.date || !form.venue) { showToast('Title, date and venue are required', 'error'); return; }
    try {
      await api.createEvent(form);
      showToast('Event created as draft! Publish it when ready.', 'success');
      onCreated();
    } catch (err) { showToast(err.response?.data?.error || 'Create failed', 'error'); }
  };

  const cats  = ['Technical','Cultural','Workshop','Sports','General'].map(c=>({value:c,label:c}));
  const depts = ['CSE','ECE','MECH','CIVIL','IT','ALL'].map(d=>({value:d,label:d}));

  return (
    <div>
      <PageHeader title="Create Event" subtitle="Fill in the details and publish when ready" />
      <Card style={{ padding:28, maxWidth:560 }}>
        <Input label="Event title" value={form.title} onChange={set('title')} required placeholder="e.g. Annual Hackathon 2025" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Input label="Date" value={form.date} onChange={set('date')} type="date" required />
          <Input label="Time" value={form.time} onChange={set('time')} type="time" />
        </div>
        <Input label="Venue" value={form.venue} onChange={set('venue')} required placeholder="e.g. Main Auditorium" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          <Select label="Category"   value={form.category} onChange={set('category')} options={cats} />
          <Select label="Department" value={form.dept}     onChange={set('dept')}     options={depts} />
          <Input  label="Capacity"   value={form.capacity} onChange={v=>set('capacity')(Number(v))} type="number" />
        </div>
        <Textarea label="Description" value={form.description} onChange={set('description')} rows={4} placeholder="Describe the event…" />
        <Btn onClick={create} accent={ACCENT}>Create event (save as draft)</Btn>
      </Card>
    </div>
  );
}

// ── Registrants ───────────────────────────────────────────
function RegistrantsPage({ showToast }) {
  const [events, setEvents]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [regs, setRegs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEvents()
      .then(r => { const evts = r.data.events||[]; setEvents(evts); if(evts.length) setSelected(evts[0].id); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) api.getEventRegistrations(selected).then(r => setRegs(r.data.registrations||[]));
  }, [selected]);

  const exportCSV = () => {
    const rows = [['Name','Email','Dept','Status','Registered At'],
      ...regs.map(r=>[r.student?.name, r.student?.email, r.student?.dept, r.status, new Date(r.registered_at).toLocaleDateString()])];
    const csv = rows.map(r=>r.map(v=>`"${v||''}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `registrations-${selected}.csv`; a.click();
    showToast('CSV exported', 'success');
  };

  if (loading) return <Spinner />;
  const evt = events.find(e=>e.id===selected);

  return (
    <div>
      <PageHeader title="Registrations" subtitle="View and export participant lists per event"
        action={<Btn onClick={exportCSV} variant="secondary" accent={ACCENT}>⬇ Export CSV</Btn>} />

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {events.map(e => (
          <button key={e.id} onClick={() => setSelected(e.id)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
            border:`1px solid ${selected===e.id?ACCENT:'rgba(0,0,0,0.12)'}`,
            background: selected===e.id?ACCENT:'#fff', color: selected===e.id?'#fff':'#6b6963',
          }}>{e.title} ({e.registration_count||0})</button>
        ))}
      </div>

      {evt && (
        <Card>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(0,0,0,0.08)', fontSize:14, fontWeight:600 }}>
            {evt.title} · {regs.length} registrations · Capacity {evt.capacity}
          </div>
          {regs.length === 0 && <EmptyState icon="👥" title="No registrations yet" />}
          {regs.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'#e8e6e0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#6b6963', flexShrink:0 }}>
                {r.student?.avatar}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1917' }}>{r.student?.name}</div>
                <div style={{ fontSize:12, color:'#9b9890' }}>{r.student?.dept} · {r.student?.email}</div>
              </div>
              <StatusBadge status={r.status} />
              {r.attended && <Badge label="Attended" color="#0F6E56" bg="#E1F5EE" />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── Attendance ────────────────────────────────────────────
function AttendancePage({ showToast }) {
  const [events, setEvents]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [list, setList]         = useState([]);

  useEffect(() => {
    api.getEvents().then(r => {
      const evts = r.data.events||[];
      setEvents(evts);
      if (evts.length) setSelected(evts[0].id);
    });
  }, []);

  const loadList = useCallback(() => {
    if (selected) api.getAttendance(selected).then(r => setList(r.data.attendance||[]));
  }, [selected]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleMark = async (studentId, attended) => {
    try {
      await api.markAttendance(selected, studentId, attended);
      showToast(attended ? 'Marked attended — certificate issued!' : 'Marked absent', attended?'success':'info');
      loadList();
    } catch (err) { showToast(err.response?.data?.error||'Failed','error'); }
  };

  const evt = events.find(e=>e.id===selected);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark attendance and trigger certificate generation"
        action={
          selected
            ? <a href={api.exportAttendance(selected)} style={{ textDecoration:'none' }}>
                <Btn variant="secondary" accent={ACCENT}>⬇ Export CSV</Btn>
              </a>
            : null
        }
      />

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {events.map(e => (
          <button key={e.id} onClick={() => setSelected(e.id)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
            border:`1px solid ${selected===e.id?ACCENT:'rgba(0,0,0,0.12)'}`,
            background: selected===e.id?ACCENT:'#fff', color: selected===e.id?'#fff':'#6b6963',
          }}>{e.title}</button>
        ))}
      </div>

      {evt && (
        <Card>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(0,0,0,0.08)', fontSize:13, fontWeight:600 }}>
            {evt.title} · {list.filter(r=>r.attended).length}/{list.length} attended
          </div>
          {list.length === 0 && <EmptyState icon="✅" title="No approved registrations for this event" />}
          {list.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:r.attended?'#E1F5EE':'#f5f4f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:r.attended?'#0F6E56':'#6b6963', flexShrink:0 }}>
                {r.student?.avatar}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1917' }}>{r.student?.name}</div>
                <div style={{ fontSize:12, color:'#9b9890' }}>{r.student?.dept}</div>
              </div>
              {r.attended
                ? <Badge label="Attended ✓" color="#0F6E56" bg="#E1F5EE" />
                : <Badge label="Absent"     color="#6b6963" bg="#f5f4f0" />}
              <Btn onClick={() => handleMark(r.student_id, !r.attended)} accent={r.attended?'#854F0B':ACCENT} small>
                {r.attended ? 'Mark Absent' : 'Mark Attended'}
              </Btn>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── Volunteers ────────────────────────────────────────────
function VolunteersPage({ showToast }) {
  const [events, setEvents]         = useState([]);
  const [selected, setSelected]     = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [students, setStudents]     = useState([]);
  const [studentId, setStudentId]   = useState('');
  const [task, setTask]             = useState('Stage setup');

  useEffect(() => {
    api.getEvents().then(r => {
      const evts = r.data.events||[];
      setEvents(evts);
      if (evts.length) setSelected(evts[0].id);
    });
    // Load all students via the new /api/auth/users endpoint
    api.getUsers({ role:'student' }).then(r => {
      const users = r.data.users||[];
      setStudents(users.map(u => ({ value:u.id, label:`${u.name} (${u.dept})` })));
      if (users.length) setStudentId(users[0].id);
    });
  }, []);

  const loadVolunteers = useCallback(() => {
    if (selected) api.getVolunteers(selected).then(r => setVolunteers(r.data.volunteers||[]));
  }, [selected]);

  useEffect(() => { loadVolunteers(); }, [loadVolunteers]);

  const handleAssign = async () => {
    if (!task || !studentId || !selected) return;
    try {
      await api.assignVolunteer(selected, studentId, task);
      showToast('Volunteer assigned and notified!', 'success');
      loadVolunteers();
    } catch (err) { showToast(err.response?.data?.error||'Failed','error'); }
  };

  const handleRemove = async (sid) => {
    try {
      await api.removeVolunteer(selected, sid);
      showToast('Volunteer removed','info');
      loadVolunteers();
    } catch { showToast('Failed','error'); }
  };

  const taskOptions = ['Stage setup','Registration desk','Technical support','Hospitality','Photography','Security','Food distribution'].map(t=>({value:t,label:t}));

  return (
    <div>
      <PageHeader title="Volunteer Management" subtitle="Assign students as event volunteers with specific tasks" />

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {events.map(e => (
          <button key={e.id} onClick={() => setSelected(e.id)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
            border:`1px solid ${selected===e.id?ACCENT:'rgba(0,0,0,0.12)'}`,
            background: selected===e.id?ACCENT:'#fff', color: selected===e.id?'#fff':'#6b6963',
          }}>{e.title}</button>
        ))}
      </div>

      <Card style={{ padding:20, marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#6b6963', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Assign Volunteer</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, alignItems:'flex-end' }}>
          {students.length > 0
            ? <Select label="Student" value={studentId} onChange={setStudentId} options={students} />
            : <div style={{ fontSize:13, color:'#9b9890', paddingTop:24 }}>Loading students…</div>}
          <Select label="Task" value={task} onChange={setTask} options={taskOptions} />
          <Btn onClick={handleAssign} accent={ACCENT} disabled={!students.length || !selected}>Assign</Btn>
        </div>
      </Card>

      <Card>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(0,0,0,0.08)', fontSize:14, fontWeight:600 }}>
          Assigned Volunteers ({volunteers.length})
        </div>
        {volunteers.length === 0 && <EmptyState icon="🙋" title="No volunteers assigned yet" />}
        {volunteers.map(v => (
          <div key={v.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#0F6E56', flexShrink:0 }}>
              {v.student?.avatar}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#1a1917' }}>{v.student?.name}</div>
              <div style={{ fontSize:12, color:'#9b9890' }}>Task: {v.task}</div>
            </div>
            <Btn onClick={() => handleRemove(v.student_id)} variant="danger" small>Remove</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}
