import React, { useEffect, useState } from 'react';
import { Users, LayoutList, Trophy, Plus, ShieldAlert, Pencil, Trash2, X, Settings, CheckCircle, AlertTriangle, Megaphone, Send } from 'lucide-react';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <ShieldAlert size={40} color="red" />
          <h3>Something went wrong</h3>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard() {
  const [data, setData] = useState({ committees: [], users: [], leaderboard: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('committees');

  // Create Committee form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newChat, setNewChat] = useState('');

  // Edit Committee
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editChat, setEditChat] = useState('');

  // Promote Leader form
  const [showPromote, setShowPromote] = useState(false);
  const [promoteUser, setPromoteUser] = useState('');
  const [promoteCommittee, setPromoteCommittee] = useState('');

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
    } catch (e) {
      console.warn("WebApp init failed:", e);
    }
    fetchData();
  }, []);

  const getInitData = () => window.Telegram?.WebApp?.initData || '';

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin', {
        headers: { 'x-telegram-init-data': getInitData() }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to load');
      }
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const apiPost = async (action, payload) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': getInitData(),
      },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Request failed');
    }
    return res.json();
  };

  const showAlert = (msg) => {
    if (window.Telegram?.WebApp) window.Telegram.WebApp.showAlert(msg);
    else alert(msg);
  };

  const handleCreate = async () => {
    try {
      await apiPost('CREATE_COMMITTEE', { name: newName, chat_id: newChat });
      setShowCreate(false); setNewName(''); setNewChat('');
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditChat(c.chat_id || '');
  };

  const handleEdit = async () => {
    try {
      await apiPost('EDIT_COMMITTEE', { id: editingId, name: editName, chat_id: editChat });
      setEditingId(null);
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleDelete = async (c) => {
    const confirmed = window.confirm(`Delete "${c.name}"? This will also remove all memberships. This cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiPost('DELETE_COMMITTEE', { id: c.id });
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handlePromote = async () => {
    try {
      await apiPost('PROMOTE_LEADER', { telegram_id: promoteUser, committee_id: promoteCommittee });
      setShowPromote(false); setPromoteUser(''); setPromoteCommittee('');
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleBroadcast = async () => {
    const targetName = broadcastTarget
      ? data.committees.find(c => c.id === broadcastTarget)?.name || 'committee'
      : 'all members';
    const confirmed = window.confirm(`Send this message to ${targetName}?`);
    if (!confirmed) return;
    try {
      setBroadcasting(true);
      setBroadcastResult(null);
      const result = await apiPost('BROADCAST', {
        message: broadcastMsg,
        committeeId: broadcastTarget || undefined,
      });
      setBroadcastResult({ sent: result.sent, failed: result.failed });
      setBroadcastMsg('');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (error && !isLocalDev) {
    return (
      <div className="error-screen">
        <ShieldAlert size={40} color="#ff3b30" />
        <h3>Access Denied</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (loading && !isLocalDev) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  const getInitial = (name) => (name || '?').charAt(0).toUpperCase();
  const getRankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const tabs = [
    { key: 'committees', label: 'Committees', icon: <LayoutList size={15} /> },
    { key: 'users', label: 'Members', icon: <Users size={15} /> },
    { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={15} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="header">
        <h1>GGD Hub</h1>
        <p>Admin Dashboard</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content">

        {/* ======== COMMITTEES ======== */}
        {tab === 'committees' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Committees</div>
                <div className="section-count">{data.committees.length} total</div>
              </div>
              <button className="btn-icon" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? <X size={16} /> : <Plus size={16} />}
                {showCreate ? 'Close' : 'New'}
              </button>
            </div>

            {showCreate && (
              <div className="form-panel fade-in">
                <h3>Create Committee</h3>
                <input className="input" placeholder="Committee name" value={newName} onChange={e => setNewName(e.target.value)} />
                <input className="input" placeholder="Telegram Chat ID" type="number" value={newChat} onChange={e => setNewChat(e.target.value)} />
                <button className="btn-primary" onClick={handleCreate} disabled={!newName || !newChat}>Create</button>
              </div>
            )}

            {data.committees.map(c => (
              <div key={c.id} className="card">
                {editingId === c.id ? (
                  <div className="edit-form fade-in">
                    <input className="input" placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                    <input className="input" placeholder="Chat ID" type="number" value={editChat} onChange={e => setEditChat(e.target.value)} />
                    <div className="edit-actions">
                      <button className="btn-primary" onClick={handleEdit} style={{ flex: 1 }}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="card-row">
                    <div className="card-info">
                      <div className="card-name">{c.name}</div>
                      <div className="card-meta">Chat ID: {c.chat_id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-small" onClick={() => startEdit(c)}>
                        <Pencil size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Edit
                      </button>
                      <button className="btn-small btn-danger" onClick={() => handleDelete(c)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {data.committees.length === 0 && (
              <div className="empty">
                <div className="empty-icon">📋</div>
                No committees yet
              </div>
            )}
          </div>
        )}

        {/* ======== MEMBERS ======== */}
        {tab === 'users' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Members</div>
                <div className="section-count">{data.users.length} registered</div>
              </div>
              <button className="btn-icon" onClick={() => setShowPromote(!showPromote)}>
                {showPromote ? <X size={16} /> : <ShieldAlert size={16} />}
                {showPromote ? 'Close' : 'Promote'}
              </button>
            </div>

            {showPromote && (
              <div className="form-panel fade-in">
                <h3>Promote to Leader</h3>
                <select className="input" value={promoteUser} onChange={e => setPromoteUser(e.target.value)}>
                  <option value="">Select member…</option>
                  {data.users.map(u => (
                    <option key={u.telegram_id} value={u.telegram_id}>
                      {u.first_name} {u.username ? `(@${u.username})` : ''}
                    </option>
                  ))}
                </select>
                <select className="input" value={promoteCommittee} onChange={e => setPromoteCommittee(e.target.value)}>
                  <option value="">Select committee…</option>
                  {data.committees.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button className="btn-primary" onClick={handlePromote} disabled={!promoteUser || !promoteCommittee}>
                  Promote
                </button>
              </div>
            )}

            {/* Broadcast panel */}
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <button className="btn-icon" onClick={() => { setShowBroadcast(!showBroadcast); setBroadcastResult(null); }} style={{ width: '100%' }}>
                {showBroadcast ? <X size={16} /> : <Megaphone size={16} />}
                {showBroadcast ? 'Close' : 'Broadcast Message'}
              </button>
            </div>

            {showBroadcast && (
              <div className="form-panel fade-in">
                <h3>📢 Send Announcement</h3>
                <select className="input" value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)}>
                  <option value="">All members</option>
                  {data.committees.map(c => (
                    <option key={c.id} value={c.id}>{c.name} only</option>
                  ))}
                </select>
                <textarea
                  className="input textarea"
                  placeholder="Type your announcement…"
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  rows={4}
                />
                <button
                  className="btn-primary"
                  onClick={handleBroadcast}
                  disabled={!broadcastMsg.trim() || broadcasting}
                >
                  {broadcasting ? 'Sending…' : <><Send size={14} style={{ marginRight: 6 }} /> Send</>}
                </button>

                {broadcastResult && (
                  <div className="broadcast-result fade-in">
                    ✅ Sent to <strong>{broadcastResult.sent}</strong> user{broadcastResult.sent !== 1 ? 's' : ''}
                    {broadcastResult.failed > 0 && (
                      <span> · ⚠️ {broadcastResult.failed} failed</span>
                    )}
                  </div>
                )}
              </div>
            )}


            {data.users.map(u => (
              <div key={u.telegram_id} className="card">
                <div className="card-row">
                  <div className="avatar">{getInitial(u.first_name)}</div>
                  <div className="card-info">
                    <div className="card-name">
                      {u.first_name}
                      {u.username && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>@{u.username}</span>}
                    </div>
                    <div className="card-meta">ID: {u.telegram_id} · {u.points} pts</div>
                  </div>
                </div>
              </div>
            ))}

            {data.users.length === 0 && (
              <div className="empty">
                <div className="empty-icon">👥</div>
                No members yet
              </div>
            )}
          </div>
        )}

        {/* ======== LEADERBOARD ======== */}
        {tab === 'leaderboard' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Leaderboard</div>
                <div className="section-count">Top contributors</div>
              </div>
            </div>

            <ol className="lb-list">
              {(data.leaderboard || []).map((entry, i) => (
                <li key={entry.telegram_id} className="lb-item">
                  <div className={`lb-rank ${getRankClass(i)}`}>{i + 1}</div>
                  <div className="lb-info">
                    <div className="lb-name">{entry.first_name || 'Anonymous'}</div>
                    {entry.username && <div className="lb-handle">@{entry.username}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lb-points">{entry.points}</div>
                    <div className="lb-pts-label">pts</div>
                  </div>
                </li>
              ))}
            </ol>

            {(!data.leaderboard || data.leaderboard.length === 0) && (
              <div className="empty">
                <div className="empty-icon">🏆</div>
                No scores yet
              </div>
            )}
          </div>
        )}

        {/* ======== SETTINGS ======== */}
        {tab === 'settings' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Settings</div>
                <div className="section-count">Cron & schedule config</div>
              </div>
            </div>

            {data.settings ? (
              <>
                <div className="settings-group">
                  <div className="settings-label">Standup Days</div>
                  <div className="settings-value">
                    {data.settings.standupDays.length > 0
                      ? data.settings.standupDays.map(d => DAY_NAMES[d] || d).join(', ')
                      : 'None configured'}
                  </div>
                  <div className="settings-hint">Days when standup reminders are sent</div>
                </div>

                <div className="settings-group">
                  <div className="settings-label">Standup Hour</div>
                  <div className="settings-value">
                    {String(data.settings.standupHour).padStart(2, '0')}:00 UTC
                    <span className="settings-local">
                      ({String((data.settings.standupHour + 3) % 24).padStart(2, '0')}:00 your time)
                    </span>
                  </div>
                  <div className="settings-hint">Hour in UTC when reminders fire</div>
                </div>

                <div className="settings-group">
                  <div className="settings-label">Cron Security</div>
                  <div className="settings-value">
                    {data.settings.cronSecured
                      ? <span className="settings-badge settings-badge-ok"><CheckCircle size={14} /> Secured</span>
                      : <span className="settings-badge settings-badge-warn"><AlertTriangle size={14} /> Not set</span>
                    }
                  </div>
                  <div className="settings-hint">
                    {data.settings.cronSecured
                      ? 'CRON_SECRET is configured — only Vercel can trigger standups'
                      : 'Set CRON_SECRET in Vercel env vars to prevent unauthorized triggers'}
                  </div>
                </div>

                <div className="settings-note">
                  These settings are configured via environment variables in the Vercel dashboard. Changes require a redeploy.
                </div>
              </>
            ) : (
              <div className="empty">
                <div className="empty-icon">⚙️</div>
                Settings unavailable
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
