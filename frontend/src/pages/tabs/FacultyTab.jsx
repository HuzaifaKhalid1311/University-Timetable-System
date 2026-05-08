import React, { useState } from 'react';
import { api } from '../../api';

export default function FacultyTab({ faculty, departments, onRefresh }) {
  const [form, setForm] = useState({ FullName: '', Email: '', DeptID: '', Username: '', Password: '' });
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmDeact, setConfirmDeact] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const add = async () => {
    if (!form.FullName || !form.Email || !form.DeptID || !form.Username || !form.Password) {
      flash('All fields are required.', 'error'); return;
    }
    try {
      await api.post('/api/faculty', { ...form, DeptID: parseInt(form.DeptID), PasswordHash: form.Password });
      flash('Faculty registered!');
      setForm({ FullName: '', Email: '', DeptID: '', Username: '', Password: '' });
      setShowForm(false);
      onRefresh();
    } catch (e) { flash(e?.response?.data?.error || 'Failed to register.', 'error'); }
  };

  const deactivate = async (id) => {
    try {
      await api.delete(`/api/faculty/${id}`);
      flash('Faculty deactivated.');
      setConfirmDeact(null);
      onRefresh();
    } catch (e) { flash('Failed to deactivate.', 'error'); setConfirmDeact(null); }
  };

  const deptName = (id) => departments.find(d => d.DepartmentID === id)?.DepartmentName || `Dept ${id}`;
  const filtered = faculty.filter(f =>
    f.FullName?.toLowerCase().includes(search.toLowerCase()) ||
    f.Email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-title">Register Faculty Member</div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" placeholder="Dr. Jane Smith" value={form.FullName} onChange={e => set('FullName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" placeholder="jane@nu.edu.pk" value={form.Email} onChange={e => set('Email', e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" value={form.DeptID} onChange={e => set('DeptID', e.target.value)}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Username</label><input className="form-control" placeholder="jsmith" value={form.Username} onChange={e => set('Username', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Password</label><input className="form-control" type="password" placeholder="Set a password" value={form.Password} onChange={e => set('Password', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-success" onClick={add}>✓ Register</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm({ FullName: '', Email: '', DeptID: '', Username: '', Password: '' }); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="section-title" style={{ margin: 0 }}>Faculty Roster <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>{filtered.length}</span></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input className="form-control" style={{ width: '200px' }} placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
            {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Register Faculty</button>}
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5}><div className="empty-state"><div className="icon">👨‍🏫</div><h3>No faculty found</h3></div></td></tr>}
              {filtered.map(f => (
                <tr key={f.FacultyID}>
                  <td><strong>{f.FullName}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{f.Email}</td>
                  <td>{deptName(f.DepartmentID)}</td>
                  <td><span className={`badge ${f.IsActive ? 'badge-green' : 'badge-red'}`}>{f.IsActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    {f.IsActive ? (
                      confirmDeact === f.FacultyID ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => deactivate(f.FacultyID)}>Yes</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeact(null)}>No</button>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeact(f.FacultyID)}>Deactivate</button>
                      )
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
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
