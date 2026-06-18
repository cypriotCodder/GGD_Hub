import React, { useState } from 'react';
import { CheckSquare, MessageSquare, Plus, Trophy, CheckCircle, User as UserIcon } from 'lucide-react';
import Profile from './Profile';

export default function MemberPortal({ data, apiPost, fetchData, showAlert }) {
  const [tab, setTab] = useState('active');

  const [standupCompleted, setStandupCompleted] = useState('');
  const [standupNext, setStandupNext] = useState('');
  const [standupBlockers, setStandupBlockers] = useState('');
  const [submittingStandup, setSubmittingStandup] = useState(false);

  const handleClaim = async (taskId) => {
    try {
      await apiPost('CLAIM_TASK', { taskId });
      fetchData();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleComplete = async (taskId) => {
    try {
      await apiPost('COMPLETE_TASK', { taskId });
      fetchData();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleStandupSubmit = async () => {
    if (!standupCompleted.trim() && !standupNext.trim() && !standupBlockers.trim()) {
      showAlert('Please fill in at least one field.');
      return;
    }
    setSubmittingStandup(true);
    try {
      await apiPost('SUBMIT_STANDUP', {
        completed: standupCompleted,
        next: standupNext,
        blockers: standupBlockers,
      });
      setStandupCompleted('');
      setStandupNext('');
      setStandupBlockers('');
      showAlert('Standup submitted successfully!');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSubmittingStandup(false);
    }
  };

  const tabs = [
    { key: 'active', label: 'My Tasks', icon: <CheckSquare size={15} /> },
    { key: 'available', label: 'Available', icon: <Plus size={15} /> },
    { key: 'standup', label: 'Standup', icon: <MessageSquare size={15} /> },
    { key: 'profile', label: 'Profile', icon: <UserIcon size={15} /> },
  ];

  return (
    <div className="fade-in">
      <div className="header">
        <h1>Member Portal</h1>
        <p>Welcome, {data.user?.first_name || 'Volunteer'}</p>
        <div style={{ marginTop: 8, fontSize: '13px', color: 'var(--text-secondary)' }}>
          <Trophy size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
          {data.user?.points || 0} Points
        </div>
      </div>

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

      <div className="content">
        {/* ======== MY TASKS ======== */}
        {tab === 'active' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">My Tasks</div>
            </div>

            {data.activeTasks?.map(t => (
              <div key={t.id} className="card fade-in">
                <div className="card-row">
                  <div className="card-info">
                    <div className="card-name">{t.title}</div>
                    {t.description && <div className="card-meta" style={{ marginTop: 4 }}>{t.description}</div>}
                    <div className="card-meta" style={{ marginTop: 8 }}>
                      <span className="badge" style={{ background: '#f2f2f7', color: '#333' }}>{t.committees?.name || 'Global'}</span>
                      <span className="badge" style={{ background: '#e5f4eb', color: '#10b981', marginLeft: 8 }}>+{t.point_value} pts</span>
                    </div>
                  </div>
                  <div>
                    {t.status === 'completed' ? (
                      <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Completed</span>
                    ) : (
                      <button className="btn-primary" onClick={() => handleComplete(t.id)}>
                        <CheckCircle size={14} style={{ marginRight: 4 }} /> Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!data.activeTasks || data.activeTasks.length === 0) && (
              <div className="empty">
                <div className="empty-icon">✅</div>
                You have no active tasks.
              </div>
            )}
          </div>
        )}

        {/* ======== AVAILABLE TASKS ======== */}
        {tab === 'available' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Available to Claim</div>
            </div>

            {data.availableTasks?.map(t => (
              <div key={t.id} className="card fade-in">
                <div className="card-row">
                  <div className="card-info">
                    <div className="card-name">{t.title}</div>
                    {t.description && <div className="card-meta" style={{ marginTop: 4 }}>{t.description}</div>}
                    <div className="card-meta" style={{ marginTop: 8 }}>
                      <span className="badge" style={{ background: '#f2f2f7', color: '#333' }}>{t.committees?.name || 'Global'}</span>
                      <span className="badge" style={{ background: '#e5f4eb', color: '#10b981', marginLeft: 8 }}>+{t.point_value} pts</span>
                    </div>
                  </div>
                  <div>
                    <button className="btn-small" onClick={() => handleClaim(t.id)}>
                      Claim
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!data.availableTasks || data.availableTasks.length === 0) && (
              <div className="empty">
                <div className="empty-icon">🎉</div>
                No pending tasks right now.
              </div>
            )}
          </div>
        )}

        {/* ======== STANDUP ======== */}
        {tab === 'standup' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Submit Standup</div>
            </div>
            <div className="form-panel">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Submit your weekly progress report. This will be recorded for your committee leaders.
              </p>
              
              <div className="form-group">
                <label>What did you complete this week?</label>
                <textarea 
                  className="input textarea" 
                  rows={3} 
                  placeholder="E.g., Finished the UI design..."
                  value={standupCompleted}
                  onChange={e => setStandupCompleted(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>What are your next steps?</label>
                <textarea 
                  className="input textarea" 
                  rows={3} 
                  placeholder="E.g., Starting the backend integration..."
                  value={standupNext}
                  onChange={e => setStandupNext(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Any blockers?</label>
                <textarea 
                  className="input textarea" 
                  rows={2} 
                  placeholder="E.g., Waiting for API keys..."
                  value={standupBlockers}
                  onChange={e => setStandupBlockers(e.target.value)}
                />
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
                onClick={handleStandupSubmit}
                disabled={submittingStandup}
              >
                {submittingStandup ? 'Submitting...' : 'Submit Standup'}
              </button>
            </div>
          </div>
        )}

        {/* ======== PROFILE ======== */}
        {tab === 'profile' && (
          <Profile user={data.user} completedTasks={data.completedTasks} standups={data.myStandups} />
        )}
      </div>
    </div>
  );
}
