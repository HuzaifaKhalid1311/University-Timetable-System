import React, { useState, useEffect } from 'react';
import { api } from '../../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt(t) {
  if (!t) return '';
  if (t instanceof Date) {
    return String(t.getUTCHours()).padStart(2,'0') + ':' + String(t.getUTCMinutes()).padStart(2,'0');
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

export default function TimetableTab({ offerings, rooms, timeslots, onRefresh }) {
  const [form, setForm] = useState({ OfferingID: '', RoomID: '', SlotID: '' });
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [lastAddedId, setLastAddedId] = useState(null);
  const [rescId, setRescId] = useState(null);
  const [rescRoom, setRescRoom] = useState('');
  const [rescSlot, setRescSlot] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const flash = (text, type = 'success') => setMsg({ text, type });
  const activeRooms = rooms.filter(r => r.IsActive);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    try {
      const r = await api.get('/api/export');
      setEntries(r.data);
      return r.data;
    } catch (e) {
      console.error('loadEntries failed:', e);
      return null;
    }
  };

  const schedule = async () => {
    const oid = parseInt(form.OfferingID);
    const rid = parseInt(form.RoomID);
    const sid = parseInt(form.SlotID);

    if (!form.OfferingID || !form.RoomID || !form.SlotID || isNaN(oid) || isNaN(rid) || isNaN(sid)) {
      flash('Please select a course offering, a room, and a time slot.', 'error');
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await api.post('/api/timetable', { OfferingID: oid, RoomID: rid, SlotID: sid });
      if (res.data?.success) {
        // Reload entries — backend now sorts by EntryID DESC, so new entry is FIRST
        const fresh = await loadEntries();
        if (fresh && fresh.length > 0) {
          setLastAddedId(fresh[0].EntryID); // mark the top row as newly added
          setTimeout(() => setLastAddedId(null), 6000);  // clear highlight after 6s
        }
        flash(`✅ Scheduled successfully! New entry is highlighted at the top of the table.`, 'success');
        setForm({ OfferingID: '', RoomID: '', SlotID: '' });
        setSearchQ(''); // clear any search so the new entry is visible
      } else {
        flash('Unexpected response from server.', 'error');
      }
    } catch (e) {
      const errMsg = e?.response?.data?.error || e?.response?.data?.message || '';
      if (errMsg.toLowerCase().includes('already booked') || errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique')) {
        flash('❌ Conflict: That room is already booked for this time slot. Choose a different room or slot.', 'error');
      } else if (errMsg) {
        flash(`❌ Error: ${errMsg}`, 'error');
      } else {
        flash('❌ Failed to schedule. The room+slot may already be taken.', 'error');
        console.error('Schedule error:', e);
      }
    } finally {
      setSaving(false);
    }
  };

  const reschedule = async (entryId) => {
    if (!rescRoom || !rescSlot) { flash('Select a new room and slot.', 'error'); return; }
    try {
      await api.put(`/api/timetable/${entryId}/reschedule`, {
        NewRoomID: parseInt(rescRoom),
        NewSlotID: parseInt(rescSlot),
      });
      flash('Rescheduled successfully!', 'success');
      setRescId(null); setRescRoom(''); setRescSlot('');
      loadEntries();
    } catch (e) {
      flash(e?.response?.data?.error || 'Reschedule failed — slot may already be taken.', 'error');
    }
  };

  // Search all visible columns
  const q = searchQ.toLowerCase();
  const filtered = entries.filter(e =>
    !q ||
    (e.CourseCode    || '').toLowerCase().includes(q) ||
    (e.CourseName    || '').toLowerCase().includes(q) ||
    (e.FacultyName   || '').toLowerCase().includes(q) ||
    (e.DepartmentName|| '').toLowerCase().includes(q) ||
    (e.SectionName   || '').toLowerCase().includes(q) ||
    (e.RoomName      || '').toLowerCase().includes(q) ||
    (e.DayOfWeek     || '').toLowerCase().includes(q)
  );

  return (
    <div className="fade-in">
      {/* Persistent alert */}
      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}>✕</button>
        </div>
      )}

      {/* Schedule a Class */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Schedule a Class</div>
        <div className="grid-3" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Course Offering</label>
            <select className="form-control" value={form.OfferingID} onChange={e => set('OfferingID', e.target.value)}>
              <option value="">— Select Offering —</option>
              {offerings.map(o => (
                <option key={o.OfferingID} value={o.OfferingID}>
                  {o.CourseCode} – {o.CourseName} ({o.SectionName})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Room</label>
            <select className="form-control" value={form.RoomID} onChange={e => set('RoomID', e.target.value)}>
              <option value="">— Select Room —</option>
              {activeRooms.map(r => (
                <option key={r.RoomID} value={r.RoomID}>{r.RoomName} ({r.RoomType}, cap {r.Capacity})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Time Slot</label>
            <select className="form-control" value={form.SlotID} onChange={e => set('SlotID', e.target.value)}>
              <option value="">— Select Slot —</option>
              {DAYS.map(day => {
                const daySlots = timeslots.filter(t => t.DayOfWeek === day);
                return daySlots.length > 0 ? (
                  <optgroup key={day} label={day}>
                    {daySlots.map(t => (
                      <option key={t.SlotID} value={t.SlotID}>
                        {t.DayOfWeek} {fmt(t.StartTime)}–{fmt(t.EndTime)}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={schedule} disabled={saving} style={{ minWidth: '160px' }}>
          {saving ? '⏳ Scheduling…' : '+ Schedule Class'}
        </button>
      </div>

      {/* Timetable entries — sorted newest first */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="section-title" style={{ margin: 0 }}>Timetable Entries</div>
            <span className="badge badge-blue">{filtered.length}</span>
            {lastAddedId && <span className="badge badge-green" style={{ animation: 'pulse 1s ease infinite' }}>✨ New entry at top</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-control"
              style={{ width: '220px' }}
              placeholder="🔍 Search course, room, day…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" onClick={loadEntries} title="Refresh">↻</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Section</th>
                <th>Faculty</th>
                <th>Room</th>
                <th>Day</th>
                <th>Start</th>
                <th>Reschedule</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div className="icon">📅</div><h3>No entries found</h3></div></td></tr>
              )}
              {filtered.map((e, i) => {
                const isNew = e.EntryID === lastAddedId;
                return (
                  <React.Fragment key={e.EntryID ?? i}>
                    <tr style={isNew ? { background: 'rgba(16,217,143,0.08)', outline: '1px solid rgba(16,217,143,0.4)' } : {}}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.CourseCode}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.CourseName}</div>
                      </td>
                      <td><span className="badge badge-blue">{e.SectionName}</span></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{e.FacultyName}</td>
                      <td><span className="chip">{e.RoomName}</span></td>
                      <td>{e.DayOfWeek}</td>
                      <td>{fmt(e.StartTime)}</td>
                      <td>
                        {rescId === e.EntryID ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRescId(null); setRescRoom(''); setRescSlot(''); }}>Cancel</button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRescId(e.EntryID); setRescRoom(''); setRescSlot(''); }}>↺</button>
                        )}
                      </td>
                    </tr>
                    {rescId === e.EntryID && (
                      <tr>
                        <td colSpan={7} style={{ background: 'rgba(251,191,36,0.05)', borderTop: '1px solid rgba(251,191,36,0.3)' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                              <label className="form-label">New Room</label>
                              <select className="form-control" value={rescRoom} onChange={ev => setRescRoom(ev.target.value)}>
                                <option value="">Select Room…</option>
                                {activeRooms.map(r => <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>)}
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                              <label className="form-label">New Slot</label>
                              <select className="form-control" value={rescSlot} onChange={ev => setRescSlot(ev.target.value)}>
                                <option value="">Select Slot…</option>
                                {timeslots.map(t => <option key={t.SlotID} value={t.SlotID}>{t.DayOfWeek} {fmt(t.StartTime)}</option>)}
                              </select>
                            </div>
                            <button className="btn btn-success" onClick={() => reschedule(e.EntryID)}>Confirm</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
