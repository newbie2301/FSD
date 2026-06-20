import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const login    = (email, password) => api.post('/auth/login',    { email, password });
export const register = (data)            => api.post('/auth/register',  data);
export const getMe    = ()                => api.get('/auth/me');

// ── Events ────────────────────────────────────────────────
export const getEvents       = (params)       => api.get('/events', { params });
export const getEvent        = (id)           => api.get(`/events/${id}`);
export const createEvent     = (data)         => api.post('/events', data);
export const updateEvent     = (id, data)     => api.patch(`/events/${id}`, data);
export const publishEvent    = (id, published)=> api.patch(`/events/${id}/publish`, { published });
export const updateSchedule  = (id, schedule) => api.patch(`/events/${id}/schedule`, { schedule });

// ── Registrations ─────────────────────────────────────────
export const registerForEvent      = (event_id)       => api.post('/registrations', { event_id });
export const cancelRegistration    = (eventId)        => api.delete(`/registrations/${eventId}`);
export const getMyRegistrations    = ()               => api.get('/registrations/my');
export const getEventRegistrations = (eventId)        => api.get(`/registrations/event/${eventId}`);
export const getPendingApprovals   = ()               => api.get('/registrations/pending');
export const approveRegistration   = (id)             => api.patch(`/registrations/${id}/approve`);
export const rejectRegistration    = (id, reason)     => api.patch(`/registrations/${id}/reject`, { reason });

// ── Attendance ────────────────────────────────────────────
export const getAttendance      = (eventId)                  => api.get(`/attendance/${eventId}`);
export const markAttendance     = (eventId, studentId, attended) => api.patch(`/attendance/${eventId}/${studentId}`, { attended });
export const exportAttendance   = (eventId)                  => `/api/attendance/${eventId}/export`;

// ── Volunteers ────────────────────────────────────────────
export const getVolunteers    = (eventId)             => api.get(`/volunteers/${eventId}`);
export const assignVolunteer  = (event_id, student_id, task) => api.post('/volunteers', { event_id, student_id, task });
export const removeVolunteer  = (eventId, studentId)  => api.delete(`/volunteers/${eventId}/${studentId}`);

// ── Notifications ─────────────────────────────────────────
export const getNotifications = ()   => api.get('/notifications');
export const markAllRead      = ()   => api.patch('/notifications/read-all');
export const markOneRead      = (id) => api.patch(`/notifications/${id}/read`);

// ── Feedback ──────────────────────────────────────────────
export const submitFeedback   = (event_id, rating, comment) => api.post('/feedback', { event_id, rating, comment });
export const getEventFeedback = (eventId)                   => api.get(`/feedback/${eventId}`);

// ── Certificates ──────────────────────────────────────────
export const getMyCertificates  = ()       => api.get('/certificates');
export const getCertificate     = (eventId)=> api.get(`/certificates/${eventId}`);

// ── Users (for volunteer selector) ───────────────────────
export const getUsers = (params) => api.get('/auth/users', { params });
