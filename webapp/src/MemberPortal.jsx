import React, { useState } from 'react';
import { CheckSquare, MessageSquare, Plus, Trophy, CheckCircle, User as UserIcon } from 'lucide-react';
import Profile from './Profile';

export default function MemberPortal({ data, apiPost, fetchData, showAlert }) {
  const [tab, setTab] = useState('active');

  const [standupTamamlandı, setStandupTamamlandı] = useState('');
  const [standupNext, setStandupNext] = useState('');
  const [standupBlockers, setStandupBlockers] = useState('');
  const [submittingStandup, setGöndertingStandup] = useState(false);

  const triggerHaptic = (type = 'light') => {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'success') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
        }
      }
    } catch (e) {}
  };

  const handleClaim = async (taskId) => {
    triggerHaptic('light');
    try {
      await apiPost('CLAIM_TASK', { taskId });
      triggerHaptic('success');
      fetchData();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleComplete = async (taskId) => {
    triggerHaptic('light');
    try {
      await apiPost('COMPLETE_TASK', { taskId });
      triggerHaptic('success');
      fetchData();
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleStandupGönder = async () => {
    triggerHaptic('light');
    if (!standupTamamlandı.trim() && !standupNext.trim() && !standupBlockers.trim()) {
      showAlert('Please fill in at least one field.');
      return;
    }
    setSubmittingStandup(true);
    try {
      await apiPost('SUBMIT_STANDUP', {
        completed: standupTamamlandı,
        next: standupNext,
        blockers: standupBlockers,
      });
      setStandupTamamlandı('');
      setStandupNext('');
      setStandupBlockers('');
      triggerHaptic('success');
      showAlert('Standup submitted successfully!');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSubmittingStandup(false);
    }
  };

  const tabs = [
    { key: 'active', label: 'Görevlerim', icon: <CheckSquare size={15} /> },
    { key: 'available', label: 'Açık Görevler', icon: <Plus size={15} /> },
    { key: 'standup', label: 'Standup', icon: <MessageSquare size={15} /> },
    { key: 'profile', label: 'Profil', icon: <UserIcon size={15} /> },
  ];

  return (
    <div className="fade-in has-bottom-bar">
      <div className="header">
        <h1>Üye Portalı</h1>
        <p>Hoş Geldin, {data.user?.first_name || 'Gönüllü'}</p>
        <div style={{ marginTop: 8, fontSize: '13px', color: 'var(--text-secondary)' }}>
          <Trophy size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
          {data.user?.puan || 0} Puan
        </div>
      </div>


      <div className="content">
        {/* ======== MY TASKS ======== */}
        {tab === 'active' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Görevlerim</div>
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
                      <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Tamamlandı</span>
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
                Aktif göreviniz bulunmuyor.
              </div>
            )}
          </div>
        )}

        {/* ======== AVAILABLE ======== */}
        {tab === 'available' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Açık Görevler</div>
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
                      Al
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!data.availableTasks || data.availableTasks.length === 0) && (
              <div className="empty">
                <div className="empty-icon">🎉</div>
                Şu an açık görev bulunmuyor.
              </div>
            )}
          </div>
        )}

        {/* ======== STANDUP ======== */}
        {tab === 'standup' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Standup Raporu</div>
            </div>
            
            <div className="card">
              <div className="form-group">
                <label>Bu hafta neleri tamamladın?</label>
                <textarea 
                  className="input textarea" 
                  rows={3} 
                  placeholder="Örn., Veritabanı kurulumu yapıldı..."
                  value={standupTamamlandı}
                  onChange={e => setStandupTamamlandı(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Sırada ne var?</label>
                <textarea 
                  className="input textarea" 
                  rows={3} 
                  placeholder="Örn., API entegrasyonu başlayacak..."
                  value={standupNext}
                  onChange={e => setStandupNext(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Herhangi bir engel var mı?</label>
                <textarea 
                  className="input textarea" 
                  rows={2} 
                  placeholder="Örn., API anahtarlarını bekliyorum..."
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
                {submittingStandup ? 'Gönderiliyor...' : 'Standup Gönder'}
              </button>
            </div>
          </div>
        )}

        {/* ======== PROFILE ======== */}
        {tab === 'profile' && (
          <Profile user={data.user} completedTasks={data.completedTasks} standups={data.myStandups} />
        )}
      </div>

      {/* ======== BOTTOM NAVIGATION ======== */}
      <div className="bottom-tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`bottom-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => { triggerHaptic('light'); setTab(t.key); }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
