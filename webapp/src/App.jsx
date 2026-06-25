import React, { useEffect, useState } from 'react';
import { Users, LayoutList, Trophy, Plus, ShieldAlert, Pencil, Trash2, X, Settings, CheckCircle, AlertTriangle, Megaphone, Send, CheckSquare, MessageSquare, Link, ChevronRight, BarChart2 } from 'lucide-react';
import MemberPortal from './MemberPortal';
import Profile from './Profile';
import Analytics from './Analytics';
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
  const [data, setData] = useState({ committees: [], users: [], liderboard: [], tasks: [], standups: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('analytics');

  // Komite Oluştur form
  const [showOluştur, setShowOluştur] = useState(false);
  const [newName, setNewName] = useState('');
  const [newChat, setNewChat] = useState('');

  // Komiteyi Düzenle
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editChat, setEditChat] = useState('');

  // Üye Ekle form
  const [showEkleMember, setShowEkleMember] = useState(false);
  const [addMemberUser, setEkleMemberUser] = useState('');
  const [addMemberCommittee, setEkleMemberCommittee] = useState('');
  const [addMemberRol, setEkleMemberRol] = useState('üye');

  // Oluştur Task form
  const [showOluşturTask, setShowOluşturTask] = useState(false);
  const [newTaskBaşlık, setNewTaskBaşlık] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPuan, setNewTaskPuan] = useState(5);
  const [newTaskCommittee, setNewTaskCommittee] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastHedef, setBroadcastHedef] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);

  // Profile Modal
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

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
      const res = await fetch('/api/app', {
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
    const res = await fetch('/api/app', {
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

  const copyInviteLink = (committeeId) => {
    if (!data.settings?.botUsername) {
      showAlert('Bot username not configured.');
      return;
    }
    const link = `https://t.me/${data.settings.botUsername}?start=join_${committeeId}`;
    navigator.clipboard.writeText(link).then(() => {
      showAlert('Invite link copied to clipboard!');
    }).catch(() => {
      showAlert('Failed to copy link.');
    });
  };

  const handleOluştur = async () => {
    try {
      await apiPost('CREATE_COMMITTEE', { name: newName, chat_id: newChat });
      setShowOluştur(false); setNewName(''); setNewChat('');
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
    const confirmed = window.confirm(`Delete "${c.name}"? This will also remove all üyeships. This cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiPost('DELETE_COMMITTEE', { id: c.id });
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleDeleteTask = async (t) => {
    const confirmed = window.confirm(`Delete task "${t.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiPost('DELETE_TASK', { id: t.id });
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleOluşturTask = async () => {
    try {
      await apiPost('CREATE_TASK', { 
        title: newTaskBaşlık, 
        description: newTaskDesc, 
        puan: newTaskPuan, 
        committee_id: newTaskCommittee, 
        assigned_to: newTaskAssignee 
      });
      setShowOluşturTask(false);
      setNewTaskBaşlık('');
      setNewTaskDesc('');
      setNewTaskPuan(5);
      setNewTaskCommittee('');
      setNewTaskAssignee('');
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleEkleMember = async () => {
    try {
      await apiPost('ADD_MEMBER', { telegram_id: addMemberUser, committee_id: addMemberCommittee, role: addMemberRol });
      setShowEkleMember(false); setEkleMemberUser(''); setEkleMemberCommittee(''); setEkleMemberRol('üye');
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleBroadcast = async () => {
    const targetName = broadcastHedef
      ? data.committees.find(c => c.id === broadcastHedef)?.name || 'committee'
      : 'all üyes';
    const confirmed = window.confirm(`Send this message to ${targetName}?`);
    if (!confirmed) return;
    try {
      setBroadcasting(true);
      setBroadcastResult(null);
      const result = await apiPost('BROADCAST', {
        message: broadcastMsg,
        committeeId: broadcastHedef || undefined,
      });
      setBroadcastResult({ sent: result.sent, failed: result.failed });
      setBroadcastMsg('');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRemoveMember = async (telegramId, committeeId, committeeName) => {
    if (!window.confirm(`Remove user from ${committeeName}?`)) return;
    try {
      await apiPost('REMOVE_MEMBER', { telegram_id: telegramId, committee_id: committeeId });
      fetchData();
    } catch (err) { showAlert(err.message); }
  };

  const handleChangeRol = async (telegramId, committeeId, currentRol, committeeName) => {
    const newRol = currentRol === 'lider' ? 'üye' : 'lider';
    if (!window.confirm(`Change role in ${committeeName} to ${newRol}?`)) return;
    try {
      await apiPost('CHANGE_ROLE', { telegram_id: telegramId, committee_id: committeeId, role: newRol });
      fetchData();
    } catch (err) { showAlert(err.message); }
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
    { key: 'analytics', label: 'Analiz', icon: <BarChart2 size={15} /> },
    { key: 'committees', label: 'Komiteler', icon: <LayoutList size={15} /> },
    { key: 'users', label: 'Üyeler', icon: <Users size={15} /> },
    { key: 'görev', label: 'Görevler', icon: <CheckSquare size={15} /> },
    { key: 'standups', label: 'Standup\'lar', icon: <MessageSquare size={15} /> },
    { key: 'liderboard', label: 'Liderlik Tablosu', icon: <Trophy size={15} /> },
    { key: 'settings', label: 'Ayarlar', icon: <Settings size={15} /> },
  ];

  if (data.role === 'üye') {
    return <MemberPortal data={data} apiPost={apiPost} fetchData={fetchData} showAlert={showAlert} />;
  }

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

        {/* ======== ANALYTICS ======== */}
        {tab === 'analytics' && (
          <Analytics data={data} />
        )}

        {/* ======== COMMITTEES ======== */}
        {tab === 'committees' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Committees</div>
                <div className="section-count">{data.committees.length} total</div>
              </div>
              <button className="btn-icon" onClick={() => setShowOluştur(!showOluştur)}>
                {showOluştur ? <X size={16} /> : <Plus size={16} />}
                {showOluştur ? 'Kapat' : 'New'}
              </button>
            </div>

            {showOluştur && (
              <div className="form-panel fade-in">
                <h3>Komite Oluştur</h3>
                <input className="input" placeholder="Committee name" value={newName} onChange={e => setNewName(e.target.value)} />
                <input className="input" placeholder="Telegram Sohbet ID" type="number" value={newChat} onChange={e => setNewChat(e.target.value)} />
                <button className="btn-primary" onClick={handleOluştur} disabled={!newName || !newChat}>Oluştur</button>
              </div>
            )}

            {data.committees.map(c => (
              <div key={c.id} className="card">
                {editingId === c.id ? (
                  <div className="edit-form fade-in">
                    <input className="input" placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                    <input className="input" placeholder="Sohbet ID" type="number" value={editChat} onChange={e => setEditChat(e.target.value)} />
                    <div className="edit-actions">
                      <button className="btn-primary" onClick={handleEdit} style={{ flex: 1 }}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditingId(null)}>İptal</button>
                    </div>
                  </div>
                ) : (
                  <div className="card-row">
                    <div className="card-info">
                      <div className="card-name">{c.name}</div>
                      <div className="card-meta">Sohbet ID: {c.chat_id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => copyInviteLink(c.id)} title="Copy Invite Link">
                        <Link size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => startEdit(c)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(c)}>
                        <Trash2 size={14} color="#ff3b30" />
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
              <button className="btn-icon" onClick={() => setShowEkleMember(!showEkleMember)}>
                {showEkleMember ? <X size={16} /> : <Plus size={16} />}
                {showEkleMember ? 'Kapat' : 'Üye Ekle'}
              </button>
            </div>

            {showEkleMember && (
              <div className="form-panel fade-in">
                <h3>Ekle to Committee</h3>
                <select className="input" value={addMemberUser} onChange={e => setEkleMemberUser(e.target.value)}>
                  <option value="">Select üye…</option>
                  {data.users.map(u => (
                    <option key={u.telegram_id} value={u.telegram_id}>
                      {u.first_name} {u.username ? `(@${u.username})` : ''}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="input" style={{ flex: 1 }} value={addMemberCommittee} onChange={e => setEkleMemberCommittee(e.target.value)}>
                    <option value="">Select committee…</option>
                    {data.committees.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select className="input" style={{ width: 110 }} value={addMemberRol} onChange={e => setEkleMemberRol(e.target.value)}>
                    <option value="üye">Member</option>
                    <option value="lider">Leader</option>
                  </select>
                </div>
                <button className="btn-primary" onClick={handleEkleMember} disabled={!addMemberUser || !addMemberCommittee}>
                  Üye Ekle
                </button>
              </div>
            )}

            {/* Broadcast panel */}
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <button className="btn-icon" onClick={() => { setShowBroadcast(!showBroadcast); setBroadcastResult(null); }} style={{ width: '100%' }}>
                {showBroadcast ? <X size={16} /> : <Megaphone size={16} />}
                {showBroadcast ? 'Kapat' : 'Toplu Mesaj Gönder'}
              </button>
            </div>

            {showBroadcast && (
              <div className="form-panel fade-in">
                <h3>📢 Send Announcement</h3>
                <select className="input" value={broadcastHedef} onChange={e => setBroadcastHedef(e.target.value)}>
                  <option value="">All üyes</option>
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
                <div 
                  className="card-row" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedProfileUser(u)}
                >
                  <div className="avatar">{getInitial(u.first_name)}</div>
                  <div className="card-info">
                    <div className="card-name">
                      {u.first_name}
                      {u.username && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>@{u.username}</span>}
                    </div>
                    <div className="card-meta">ID: {u.telegram_id} · {u.puan} pts</div>
                  </div>
                  <div>
                    <ChevronRight size={16} color="var(--text-secondary)" />
                  </div>
                </div>

                {u.üyeships && u.üyeships.length > 0 && (
                  <div className="üyeships-list">
                    {u.üyeships.map(m => (
                      <div key={m.committee_id} className={`üyeship-badge ${m.role === 'lider' ? 'lider' : ''}`}>
                        <span 
                          className="üyeship-role-toggle"
                          onClick={() => handleChangeRol(u.telegram_id, m.committee_id, m.role, m.name)}
                          title="Click to toggle role"
                        >
                          {m.name} • <span style={{textTransform: 'capitalize'}}>{m.role}</span>
                        </span>
                        <button 
                          className="üyeship-remove"
                          onClick={() => handleRemoveMember(u.telegram_id, m.committee_id, m.name)}
                          title="Remove from committee"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {data.users.length === 0 && (
              <div className="empty">
                <div className="empty-icon">👥</div>
                No üyes yet
              </div>
            )}
          </div>
        )}

        {/* ======== LEADERBOARD ======== */}
        {tab === 'liderboard' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Leaderboard</div>
                <div className="section-count">Top contributors</div>
              </div>
            </div>

            <ol className="lb-list">
              {(data.liderboard || []).map((entry, i) => (
                <li key={entry.telegram_id} className="lb-item">
                  <div className={`lb-rank ${getRankClass(i)}`}>{i + 1}</div>
                  <div className="lb-info">
                    <div className="lb-name">{entry.first_name || 'Anonymous'}</div>
                    {entry.username && <div className="lb-handle">@{entry.username}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="lb-puan">{entry.puan}</div>
                    <div className="lb-pts-label">pts</div>
                  </div>
                </li>
              ))}
            </ol>

            {(!data.liderboard || data.liderboard.length === 0) && (
              <div className="empty">
                <div className="empty-icon">🏆</div>
                No scores yet
              </div>
            )}
          </div>
        )}

        {/* ======== TASKS ======== */}
        {tab === 'görev' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Tasks</div>
                <div className="section-count">{(data.tasks || []).length} total tasks</div>
              </div>
              <button className="btn-icon" onClick={() => setShowOluşturTask(!showOluşturTask)}>
                {showOluşturTask ? <X size={16} /> : <Plus size={16} />}
                {showOluşturTask ? 'Kapat' : 'Oluştur Task'}
              </button>
            </div>

            {showOluşturTask && (
              <div className="form-panel fade-in">
                <h3>Post a New Task</h3>
                <input className="input" placeholder="Task Başlık" value={newTaskBaşlık} onChange={e => setNewTaskBaşlık(e.target.value)} />
                <input className="input" placeholder="Description (Optional)" value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="input" style={{ flex: 1 }} value={newTaskCommittee} onChange={e => setNewTaskCommittee(e.target.value)}>
                    <option value="">Select committee…</option>
                    {data.committees.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input className="input" style={{ width: 90 }} type="number" placeholder="Puan" value={newTaskPuan} onChange={e => setNewTaskPuan(Number(e.target.value))} />
                </div>
                <select className="input" value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}>
                  <option value="">Assign to üye… (Optional)</option>
                  {data.users.map(u => (
                    <option key={u.telegram_id} value={u.telegram_id}>
                      {u.first_name} {u.username ? `(@${u.username})` : ''}
                    </option>
                  ))}
                </select>
                <div className="settings-hint" style={{ marginBottom: 12, marginTop: -4 }}>
                  If assigned, the user will receive a direct message notification.
                </div>
                <button className="btn-primary" onClick={handleOluşturTask} disabled={!newTaskBaşlık || !newTaskCommittee}>
                  Post Task
                </button>
              </div>
            )}

            {(data.tasks || []).map(t => (
              <div key={t.id} className="card">
                <div className="card-row" style={{ alignItems: 'flex-start' }}>
                  <div className="card-info">
                    <div className="card-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {t.title}
                      <span className={`task-badge task-status-${t.status}`}>
                        {t.status === 'in_progress' ? 'Devam Ediyor' : t.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </span>
                    </div>
                    {t.description && <div className="card-meta" style={{ marginTop: 4, marginBottom: 8, whiteSpace: 'normal', overflow: 'visible' }}>{t.description}</div>}
                    <div className="card-meta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>🎯 {t.puan} pts</span>
                      {t.committees?.name && <span>🏢 {t.committees.name}</span>}
                      {t.created_user?.first_name && <span>✏️ By {t.created_user.first_name}</span>}
                      {t.assigned_user?.first_name && <span>👤 For {t.assigned_user.first_name}</span>}
                    </div>
                  </div>
                  <button className="btn-small btn-danger" onClick={() => handleDeleteTask(t)} title="Delete Task" style={{ marginLeft: 12 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {(!data.tasks || data.tasks.length === 0) && (
              <div className="empty">
                <div className="empty-icon">✅</div>
                No tasks available
              </div>
            )}
          </div>
        )}

        {/* ======== STANDUPS ======== */}
        {tab === 'standups' && (
          <div className="fade-in">
            <div className="section-header">
              <div>
                <div className="section-title">Standup History</div>
                <div className="section-count">{(data.standups || []).length} past standups</div>
              </div>
            </div>

            {(data.standups || []).map(s => (
              <div key={s.id} className="card standup-card">
                <div className="card-info" style={{ marginBottom: 12 }}>
                  <div className="card-name">
                    {s.users?.first_name || 'Anonymous'}
                    {s.users?.username ? ` (@${s.users.username})` : ''}
                  </div>
                  <div className="card-meta">
                    🏢 {s.committees?.name || 'Unknown'} • 🕒 {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div className="standup-section">
                  <div className="standup-label">✅ Tamamlandı:</div>
                  <div className="standup-text">{s.completed || 'N/A'}</div>
                </div>
                
                <div className="standup-section">
                  <div className="standup-label">⏭️ Next:</div>
                  <div className="standup-text">{s.next || 'N/A'}</div>
                </div>
                
                <div className="standup-section">
                  <div className="standup-label">🚧 Blockers:</div>
                  <div className={`standup-text ${s.blockers ? 'has-blockers' : ''}`}>{s.blockers || 'None'}</div>
                </div>
              </div>
            ))}

            {(!data.standups || data.standups.length === 0) && (
              <div className="empty">
                <div className="empty-icon">📝</div>
                No standup reports yet
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

      {/* Profile Modal */}
      {selectedProfileUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#fff', 
            marginTop: 'auto',
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-icon" onClick={() => setSelectedProfileUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '0 16px 24px', overflowY: 'auto' }}>
              <Profile 
                user={selectedProfileUser} 
                completedTasks={data.tasks?.filter(t => t.assigned_to === selectedProfileUser.telegram_id && t.status === 'completed') || []} 
                standups={data.standups?.filter(s => s.user_id === selectedProfileUser.telegram_id) || []} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

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
