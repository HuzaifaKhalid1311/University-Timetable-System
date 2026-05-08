import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt(t) {
  if (!t) return '';
  if (t instanceof Date) {
    const h = String(t.getUTCHours()).padStart(2,'0');
    const m = String(t.getUTCMinutes()).padStart(2,'0');
    return `${h}:${m}`;
  }
  if (typeof t === 'string') {
    if (t.includes('T')) {
      const d = new Date(t);
      return String(d.getUTCHours()).padStart(2,'0') + ':' + String(d.getUTCMinutes()).padStart(2,'0');
    }
    return t.slice(0, 5);
  }
  return '';
}

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facultyId = user.facultyId;

  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('schedule');

  useEffect(() => {
    if (!facultyId) return;
    api.get(`/api/faculty-schedule/${facultyId}`)
      .then(s => setSchedule(s.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [facultyId]);

  const logout = () => { localStorage.removeItem('user'); navigate('/login'); };

  // Build weekly grid from schedule
  const gridMap = {};
  schedule.forEach(entry => {
    const day = entry.DayOfWeek;
    if (!gridMap[day]) gridMap[day] = [];
    gridMap[day].push(entry);
  });


  const printSchedule = () => {
    const win = window.open('', '_blank');
    const rows = schedule.map(s =>
      `<tr><td>${s.CourseName}</td><td>${s.SectionName}</td><td>${s.RoomName}</td><td>${s.DayOfWeek}</td><td>${fmt(s.StartTime)} – ${fmt(s.EndTime)}</td></tr>`
    ).join('');
    win.document.write(`<html><head><title>Faculty Schedule</title><style>body{font-family:sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#f0f0f0}</style></head><body><h2>Faculty Schedule – ${user.username}</h2><table><thead><tr><th>Course</th><th>Section</th><th>Room</th><th>Day</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.print();
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🎓 UniTimetable</h1>
          <p>Faculty Portal</p>
        </div>
        <nav className="sidebar-nav">
          {[
            { key: 'schedule', icon: '📅', label: 'My Schedule' },
            { key: 'grid', icon: '📆', label: 'Weekly Grid' },
          ].map(v => (
            <button key={v.key} className={`nav-item ${activeView === v.key ? 'active' : ''}`} onClick={() => setActiveView(v.key)}>
              <span className="icon">{v.icon}</span> {v.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Faculty ID <strong style={{ color: 'var(--accent-secondary)' }}>#{facultyId}</strong>
          </div>
          <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'center' }} onClick={logout}>🚪 Logout</button>
        </div>
      </aside>

      <div className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2>👨‍🏫 Faculty Dashboard</h2>
              <p>Welcome, <strong>{user.username}</strong> — Your classes and availability at a glance</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={printSchedule}>🖨️ Print Schedule</button>
          </div>
        </div>

        <div className="page-body">
          {loading ? (
            <div className="loading-container"><div className="spinner" style={{ width: '36px', height: '36px' }} /><p>Loading your schedule…</p></div>
          ) : (
            <>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Classes Assigned', value: schedule.length, icon: '📚', color: '#6378ff', bg: 'rgba(99,120,255,0.12)' },
                  { label: 'Days Teaching', value: [...new Set(schedule.map(s => s.DayOfWeek))].length, icon: '📆', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
                  { label: 'Sections', value: [...new Set(schedule.map(s => s.SectionName))].length, icon: '👥', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
                  </div>
                ))}
              </div>

              {/* Schedule Table */}
              {activeView === 'schedule' && (
                <div className="card fade-in">
                  <div className="section-title">My Class Schedule</div>
                  {schedule.length === 0 ? (
                    <div className="empty-state"><div className="icon">📅</div><h3>No classes scheduled yet</h3></div>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead><tr><th>Course</th><th>Section</th><th>Room</th><th>Day</th><th>Start</th><th>End</th></tr></thead>
                        <tbody>
                          {schedule.map((s, i) => (
                            <tr key={i}>
                              <td><strong>{s.CourseName}</strong></td>
                              <td><span className="badge badge-blue">Section {s.SectionName}</span></td>
                              <td><span className="chip">{s.RoomName}</span></td>
                              <td>{s.DayOfWeek}</td>
                              <td>{fmt(s.StartTime)}</td>
                              <td>{fmt(s.EndTime)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Weekly Grid */}
              {activeView === 'grid' && (
                <div className="card fade-in">
                  <div className="section-title">Weekly View</div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${DAYS.length}, 1fr)`, gap: '0.5rem' }}>
                    {DAYS.map(day => (
                      <div key={day}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', padding: '0.5rem', background: 'rgba(99,120,255,0.08)', borderRadius: '6px 6px 0 0', borderBottom: '1px solid var(--border)' }}>{day.slice(0, 3)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem', minHeight: '120px', background: 'rgba(255,255,255,0.01)', borderRadius: '0 0 6px 6px', border: '1px solid var(--border)', borderTop: 'none' }}>
                          {(gridMap[day] || []).map((e, i) => (
                            <div key={i} style={{ background: 'rgba(99,120,255,0.15)', border: '1px solid rgba(99,120,255,0.3)', borderRadius: '6px', padding: '0.4rem 0.5rem', fontSize: '0.72rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{e.CourseName?.split(' ').slice(0, 2).join(' ')}</div>
                              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{e.RoomName} · {fmt(e.StartTime)}</div>
                            </div>
                          ))}
                          {!(gridMap[day] || []).length && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Free</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
