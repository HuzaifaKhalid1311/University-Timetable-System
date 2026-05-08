import React, { useState } from 'react';
import { api } from '../../api';

export default function RoomsTab({ rooms, onRefresh }) {
  const [form, setForm] = useState({ RoomName: '', Capacity: 30, RoomType: 'Lecture' });
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [confirmDeact, setConfirmDeact] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const add = async () => {
    if (!form.RoomName) { flash('Enter a room name.', 'error'); return; }
    try {
      await api.post('/api/classrooms', { ...form, Capacity: parseInt(form.Capacity) });
      flash('Room added!');
      setForm({ RoomName: '', Capacity: 30, RoomType: 'Lecture' });
      onRefresh();
    } catch (e) { flash(e?.response?.data?.error || 'Failed to add room.', 'error'); }
  };

  const deactivate = async (id) => {
    try {
      await api.delete(`/api/classrooms/${id}`);
      flash('Room deactivated.');
      setConfirmDeact(null);
      onRefresh();
    } catch (e) { flash('Failed to deactivate.', 'error'); setConfirmDeact(null); }
  };

  const types = ['All', 'Lecture', 'Lab', 'Seminar'];
  const typeColor = { Lecture: 'badge-blue', Lab: 'badge-green', Seminar: 'badge-purple' };
  const filtered = rooms.filter(r => {
    const matchSearch = r.RoomName?.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === 'All' || r.RoomType === filter;
    return matchSearch && matchType;
  });

  return (
    <div className="fade-in">
      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Register New Classroom</div>
        <div className="grid-3" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Room Name</label>
            <input className="form-control" placeholder="e.g. CR-105" value={form.RoomName} onChange={e => set('RoomName', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Capacity</label>
            <input className="form-control" type="number" min={1} value={form.Capacity} onChange={e => set('Capacity', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select className="form-control" value={form.RoomType} onChange={e => set('RoomType', e.target.value)}>
              <option>Lecture</option><option>Lab</option><option>Seminar</option>
            </select>
          </div>
        </div>
        <button className="btn btn-success" onClick={add}>+ Add Room</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="section-title" style={{ margin: 0 }}>Classrooms <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>{filtered.length}</span></div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {types.map(t => <button key={t} className={`section-tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{t}</button>)}
            <input className="form-control" style={{ width: '160px' }} placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Room</th><th>Capacity</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5}><div className="empty-state"><div className="icon">🏫</div><h3>No rooms found</h3></div></td></tr>}
              {filtered.map(r => (
                <tr key={r.RoomID}>
                  <td><strong>{r.RoomName}</strong></td>
                  <td>{r.Capacity}</td>
                  <td><span className={`badge ${typeColor[r.RoomType] || 'badge-blue'}`}>{r.RoomType}</span></td>
                  <td><span className={`badge ${r.IsActive ? 'badge-green' : 'badge-red'}`}>{r.IsActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    {r.IsActive ? (
                      confirmDeact === r.RoomID ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => deactivate(r.RoomID)}>Yes</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeact(null)}>No</button>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeact(r.RoomID)}>Deactivate</button>
                      )
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Inactive</span>}
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
