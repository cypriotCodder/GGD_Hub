import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Users, LayoutList, Plus, ShieldAlert } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState({ committees: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('committees'); // 'committees' or 'users'

  // Forms
  const [showCreateCommittee, setShowCreateCommittee] = useState(false);
  const [newCommitteeName, setNewCommitteeName] = useState('');
  const [newCommitteeChat, setNewCommitteeChat] = useState('');

  const [showPromote, setShowPromote] = useState(false);
  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoteCommitteeId, setPromoteCommitteeId] = useState('');

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin', {
        headers: {
          'x-telegram-init-data': WebApp.initData,
        }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to fetch data');
      }
      const d = await res.json();
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommittee = async () => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': WebApp.initData,
        },
        body: JSON.stringify({
          action: 'CREATE_COMMITTEE',
          payload: { name: newCommitteeName, chat_id: newCommitteeChat }
        })
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreateCommittee(false);
      setNewCommitteeName('');
      setNewCommitteeChat('');
      fetchData();
    } catch (err) {
      WebApp.showAlert(err.message);
    }
  };

  const handlePromote = async () => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': WebApp.initData,
        },
        body: JSON.stringify({
          action: 'PROMOTE_LEADER',
          payload: { telegram_id: promoteUserId, committee_id: promoteCommitteeId }
        })
      });
      if (!res.ok) throw new Error('Failed to promote');
      setShowPromote(false);
      setPromoteUserId('');
      setPromoteCommitteeId('');
      fetchData(); // reload
    } catch (err) {
      WebApp.showAlert(err.message);
    }
  };

  // Skip error handling in local dev where initData is empty
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (error && !isLocalDev) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <ShieldAlert size={48} color="red" style={{ margin: '0 auto' }} />
        <h3>Access Denied</h3>
        <p>{error}</p>
        <p><small>Only admins can view this dashboard within Telegram.</small></p>
      </div>
    );
  }

  if (loading && !isLocalDev) return <div style={{ textAlign: 'center', marginTop: 50 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button 
          style={{ opacity: tab === 'committees' ? 1 : 0.6 }} 
          onClick={() => setTab('committees')}>
            <LayoutList size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/>
            Committees
        </button>
        <button 
          style={{ opacity: tab === 'users' ? 1 : 0.6 }} 
          onClick={() => setTab('users')}>
            <Users size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/>
            Users
        </button>
      </div>

      {tab === 'committees' && (
        <div>
          <button style={{marginBottom: 16}} onClick={() => setShowCreateCommittee(!showCreateCommittee)}>
            <Plus size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/>
            New Committee
          </button>
          
          {showCreateCommittee && (
            <div className="card">
              <h3>Create Committee</h3>
              <input placeholder="Committee Name" value={newCommitteeName} onChange={e=>setNewCommitteeName(e.target.value)} />
              <input placeholder="Chat ID (e.g. -100...)" type="number" value={newCommitteeChat} onChange={e=>setNewCommitteeChat(e.target.value)} />
              <button onClick={handleCreateCommittee}>Save</button>
            </div>
          )}

          {data.committees?.map(c => (
            <div key={c.id} className="card flex-between">
              <div>
                <strong>{c.name}</strong>
                <div style={{fontSize: 12, color: 'var(--hint-color)'}}>Chat ID: {c.chat_id}</div>
              </div>
            </div>
          ))}
          {data.committees?.length === 0 && <p style={{textAlign:'center', color:'var(--hint-color)'}}>No committees yet</p>}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <button style={{marginBottom: 16}} onClick={() => setShowPromote(!showPromote)}>
            <ShieldAlert size={18} style={{marginRight: 8, verticalAlign: 'middle'}}/>
            Promote Leader
          </button>

          {showPromote && (
            <div className="card">
              <h3>Promote to Leader</h3>
              <select value={promoteUserId} onChange={e=>setPromoteUserId(e.target.value)}>
                <option value="">Select User...</option>
                {data.users.map(u => (
                  <option key={u.telegram_id} value={u.telegram_id}>
                    {u.first_name} {u.username ? `(@${u.username})` : ''}
                  </option>
                ))}
              </select>

              <select value={promoteCommitteeId} onChange={e=>setPromoteCommitteeId(e.target.value)}>
                <option value="">Select Committee...</option>
                {data.committees.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button disabled={!promoteUserId || !promoteCommitteeId} onClick={handlePromote}>Promote</button>
            </div>
          )}

          {data.users?.map(u => (
            <div key={u.telegram_id} className="card flex-between">
              <div>
                <strong>{u.first_name}</strong> {u.username && <span style={{color: 'var(--hint-color)'}}>@{u.username}</span>}
                <div style={{fontSize: 12, color: 'var(--hint-color)'}}>ID: {u.telegram_id} | Points: {u.points}</div>
              </div>
            </div>
          ))}
          {data.users?.length === 0 && <p style={{textAlign:'center', color:'var(--hint-color)'}}>No users yet</p>}
        </div>
      )}
    </div>
  );
}

export default App;
