import React, { useState } from 'react';
import { api } from '../../api';

export default function CoursesTab({ courses, departments, onRefresh }) {
  const [form, setForm] = useState({ CourseCode: '', CourseName: '', CreditHours: 3, DepartmentID: '' });
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const add = async () => {
    if (!form.CourseCode || !form.CourseName || !form.DepartmentID) { flash('Fill all fields.', 'error'); return; }
    try {
      await api.post('/api/courses', { ...form, CreditHours: parseInt(form.CreditHours), DepartmentID: parseInt(form.DepartmentID) });
      flash('Course added!');
      setForm({ CourseCode: '', CourseName: '', CreditHours: 3, DepartmentID: '' });
      onRefresh();
    } catch (e) { flash(e?.response?.data?.error || 'Failed to add course.', 'error'); }
  };

  const save = async (id) => {
    try {
      await api.put(`/api/courses/${id}`, { CourseName: editName });
      flash('Course updated!');
      setEditId(null);
      onRefresh();
    } catch (e) { flash('Update failed.', 'error'); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/api/courses/${id}`);
      flash('Course deleted.');
      setConfirmDelete(null);
      onRefresh();
    } catch (e) { flash(e?.response?.data?.error || 'Cannot delete — course may be in use.', 'error'); setConfirmDelete(null); }
  };

  const filtered = courses.filter(c =>
    c.CourseName?.toLowerCase().includes(search.toLowerCase()) ||
    c.CourseCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Add New Course</div>
        <div className="grid-4" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Code</label>
            <input className="form-control" placeholder="CS301" value={form.CourseCode} onChange={e => set('CourseCode', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
            <label className="form-label">Course Name</label>
            <input className="form-control" placeholder="e.g. Data Structures" value={form.CourseName} onChange={e => set('CourseName', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Credits</label>
            <input className="form-control" type="number" min={1} max={4} value={form.CreditHours} onChange={e => set('CreditHours', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">Department</label>
            <select className="form-control" value={form.DepartmentID} onChange={e => set('DepartmentID', e.target.value)}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
            </select>
          </div>
          <button className="btn btn-success" onClick={add}>+ Add Course</button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="section-title" style={{ margin: 0 }}>All Courses <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>{filtered.length}</span></div>
          <input className="form-control" style={{ width: '220px' }} placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={4}><div className="empty-state"><div className="icon">📚</div><h3>No courses found</h3></div></td></tr>}
              {filtered.map(c => (
                <tr key={c.CourseID}>
                  <td><span className="chip">{c.CourseCode}</span></td>
                  <td>
                    {editId === c.CourseID
                      ? <input className="form-control" style={{ padding: '0.3rem 0.6rem' }} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                      : c.CourseName}
                  </td>
                  <td><span className="badge badge-cyan">{c.CreditHours} cr</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {editId === c.CourseID ? (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => save(c.CourseID)}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                        </>
                      ) : confirmDelete === c.CourseID ? (
                        <>
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-red)', alignSelf: 'center' }}>Sure?</span>
                          <button className="btn btn-danger btn-sm" onClick={() => del(c.CourseID)}>Yes, Delete</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>No</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(c.CourseID); setEditName(c.CourseName); }}>✏️ Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(c.CourseID)}>🗑️ Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
