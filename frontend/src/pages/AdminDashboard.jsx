import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import CoursesTab from './tabs/CoursesTab';
import RoomsTab from './tabs/RoomsTab';
import FacultyTab from './tabs/FacultyTab';
import StudentsTab from './tabs/StudentsTab';
import TimetableTab from './tabs/TimetableTab';

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: '📊' },
  { key: 'courses',    label: 'Courses',    icon: '📚' },
  { key: 'rooms',      label: 'Classrooms', icon: '🏫' },
  { key: 'faculty',    label: 'Faculty',    icon: '👨‍🏫' },
  { key: 'students',   label: 'Students',   icon: '🎒' },
  { key: 'timetable',  label: 'Timetable',  icon: '📅' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('overview');
  const [courses, setCourses]         = useState([]);
  const [rooms, setRooms]             = useState([]);
  const [faculty, setFaculty]         = useState([]);
  const [students, setStudents]       = useState([]);
  const [offerings, setOfferings]     = useState([]);
  const [timeslots, setTimeslots]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections]       = useState([]);
  const [deptReport, setDeptReport]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, r, f, s, o, t, d, sec, rep] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/classrooms'),
        api.get('/api/faculty'),
        api.get('/api/students'),
        api.get('/api/offerings/details'),
        api.get('/api/timeslots'),
        api.get('/api/departments'),
        api.get('/api/sections'),
        api.get('/api/reports/departments'),
      ]);
      setCourses(c.data); setRooms(r.data); setFaculty(f.data); setStudents(s.data);
      setOfferings(o.data); setTimeslots(t.data);
      setDepartments(d.data); setSections(sec.data); setDeptReport(rep.data);
    } catch (e) { console.error('Load error', e); }
    finally { setLoading(false); }
  };

  const logout = () => { localStorage.removeItem('user'); navigate('/login'); };

  const stats = [
    { label: 'Courses',           value: courses.length,                        icon: '📚', color: '#6378ff', bg: 'rgba(99,120,255,0.12)' },
    { label: 'Active Classrooms', value: rooms.filter(r => r.IsActive).length,  icon: '🏫', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
    { label: 'Active Faculty',    value: faculty.filter(f => f.IsActive).length, icon: '👨‍🏫', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { label: 'Students',          value: students.length,                        icon: '🎒', color: '#10d98f', bg: 'rgba(16,217,143,0.12)' },
    { label: 'Offerings',         value: offerings.length,                       icon: '📅', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  ];

  const maxCourses = Math.max(...deptReport.map(r => r.CourseCount || 0), 1);
  const activeTab = TABS.find(t2 => t2.key === tab);

  const protections = [
    { icon: '🔐', label: 'DB-Level Trigger', desc: 'trg_PreventDoubleBooking fires on INSERT/UPDATE', color: 'var(--accent-green)' },
    { icon: '🔍', label: 'Conflict View',    desc: 'vw_ConflictDashboard monitors overlapping entries', color: 'var(--accent-primary)' },
    { icon: '⚡', label: 'UNIQUE Constraint', desc: 'Timetable.UNIQUE(RoomID, SlotID) enforced at schema level', color: 'var(--accent-cyan)' },
    { icon: '🔄', label: 'Reschedule Tool',  desc: 'Reschedule a class to resolve any conflict', color: 'var(--accent-secondary)' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🎓 UniTimetable</h1>
          <p>Admin Control Panel</p>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <span className="icon">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Logged in as <strong style={{ color: 'var(--text-secondary)' }}>{user.username || 'Admin'}</strong>
          </div>
          <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'center' }} onClick={logout}>🚪 Logout</button>
        </div>
      </aside>

      <div className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2>{activeTab?.icon} {activeTab?.label}</h2>
              <p>University Timetable Management – Academic Year 2025-2026</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchAll}>↻ Refresh</button>
          </div>
        </div>

        <div className="page-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner" style={{ width: '36px', height: '36px' }} />
              <p>Loading data…</p>
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="fade-in">
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {stats.map(s => (
                      <div key={s.label} className="stat-card">
                        <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                        <div>
                          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                          <div className="stat-label">{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Department Overview */}
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-title">Department Overview</div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr><th>Department</th><th>Courses</th><th>Faculty</th><th>Distribution</th></tr>
                        </thead>
                        <tbody>
                          {deptReport.length === 0 && (
                            <tr><td colSpan={4}><div className="empty-state"><div className="icon">📊</div><h3>No data</h3></div></td></tr>
                          )}
                          {deptReport.map((r, i) => (
                            <tr key={i}>
                              <td><strong>{r.DepartmentName}</strong></td>
                              <td><span className="badge badge-blue">{r.CourseCount}</span></td>
                              <td><span className="badge badge-purple">{r.FacultyCount}</span></td>
                              <td style={{ width: '180px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '100px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', width: `${Math.round((r.CourseCount / maxCourses) * 100)}%`, transition: 'width 0.5s' }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* System Protections Active */}
                  <div className="card">
                    <div className="section-title">System Protections Active</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginTop: '0.5rem' }}>
                      {protections.map(item => (
                        <div key={item.label} style={{ display: 'flex', gap: '0.85rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{item.icon}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: item.color }}>{item.label}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'courses'   && <CoursesTab  courses={courses}   departments={departments} onRefresh={fetchAll} />}
              {tab === 'rooms'     && <RoomsTab    rooms={rooms}       onRefresh={fetchAll} />}
              {tab === 'faculty'   && <FacultyTab  faculty={faculty}   departments={departments} onRefresh={fetchAll} />}
              {tab === 'students'  && <StudentsTab students={students} sections={sections}       onRefresh={fetchAll} />}
              {tab === 'timetable' && (
                <TimetableTab
                  offerings={offerings}
                  rooms={rooms}
                  timeslots={timeslots}
                  onRefresh={fetchAll}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
