import React, { useState } from 'react';
import { api } from '../../api';

export default function StudentsTab({ students, sections, onRefresh }) {
  const [form, setForm] = useState({ RollNum: '', FullName: '', SecID: '', Username: '', Password: '' });
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  // Change section: track which student is being edited and the new section value
  const [editId, setEditId] = useState(null);
  const [newSecID, setNewSecID] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const add = async () => {
    if (!form.RollNum || !form.FullName || !form.SecID || !form.Username || !form.Password) {
      flash('All fields are required.', 'error'); return;
    }
    try {
      await api.post('/api/students', { ...form, SecID: parseInt(form.SecID), PasswordHash: form.Password });
      flash('Student registered!');
      setForm({ RollNum: '', FullName: '', SecID: '', Username: '', Password: '' });
      setShowForm(false);
      onRefresh();
    } catch (e) { flash(e?.response?.data?.error || 'Failed to register.', 'error'); }
  };

  const saveSection = async (studentId) => {
    if (!newSecID) { flash('Select a new section.', 'error'); return; }
    try {
      await api.put(`/api/students/${studentId}/section`, { NewSectionID: parseInt(newSecID) });
      flash('Section updated!');
      setEditId(null);
      setNewSecID('');
      onRefresh();
    } catch (e) { flash(e?.response?.data?.error || 'Failed to update section.', 'error'); }
  };

  const sectionLabel = (id) => {
    const s = sections.find(x => x.SectionID === id);
    return s ? `Sem ${s.Semester} – ${s.SectionName}` : `Section ${id}`;
  };

  const filtered = students.filter(s =>
    s.FullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.RollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-title">Register New Student</div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Roll Number</label><input className="form-control" placeholder="24L-0001" value={form.RollNum} onChange={e => set('RollNum', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" placeholder="Ali Ahmed" value={form.FullName} onChange={e => set('FullName', e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-control" value={form.SecID} onChange={e => set('SecID', e.target.value)}>
                <option value="">Select Section</option>
                {sections.map(s => <option key={s.SectionID} value={s.SectionID}>Sem {s.Semester} – {s.SectionName} (Dept {s.DepartmentID})</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Username</label><input className="form-control" placeholder="24l0001" value={form.Username} onChange={e => set('Username', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Password</label><input className="form-control" type="password" placeholder="Set a password" value={form.Password} onChange={e => set('Password', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-success" onClick={add}>✓ Register</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm({ RollNum: '', FullName: '', SecID: '', Username: '', Password: '' }); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="section-title" style={{ margin: 0 }}>Student Directory <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>{filtered.length}</span></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input className="form-control" style={{ width: '200px' }} placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
            {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Register Student</button>}
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Roll No.</th><th>Name</th><th>Current Section</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={4}><div className="empty-state"><div className="icon">🎒</div><h3>No students found</h3></div></td></tr>}
              {filtered.map(s => (
                <tr key={s.StudentID}>
                  <td><span className="chip">{s.RollNumber}</span></td>
                  <td><strong>{s.FullName}</strong></td>
                  <td>{sectionLabel(s.SectionID)}</td>
                  <td>
                    {editId === s.StudentID ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <select
                          className="form-control"
                          style={{ padding: '0.3rem 0.6rem', width: '160px' }}
                          value={newSecID}
                          onChange={e => setNewSecID(e.target.value)}
                        >
                          <option value="">Select section…</option>
                          {sections.map(sec => (
                            <option key={sec.SectionID} value={sec.SectionID}>
                              Sem {sec.Semester} – {sec.SectionName}
                            </option>
                          ))}
                        </select>
                        <button className="btn btn-success btn-sm" onClick={() => saveSection(s.StudentID)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(null); setNewSecID(''); }}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(s.StudentID); setNewSecID(''); }}>
                        ✏️ Change Section
                      </button>
                    )}
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
