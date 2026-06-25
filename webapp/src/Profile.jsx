import React from 'react';
import { Award, Star, CheckCircle, Flame, Shield, Activity, MessageSquare } from 'lucide-react';

export function calculateGamification(user, completedTasks, standups) {
  const puan = user?.puan || 0;
  const level = Math.floor(puan / 50) + 1;
  const puanInLevel = puan % 50;
  const progressPercent = (puanInLevel / 50) * 100;

  const levelBaşlıks = {
    1: 'Çaylak',
    2: 'Çırak',
    3: 'Katkıda Bulunan',
    4: 'Kıdemli',
    5: 'Uzman',
  };
  const title = level >= 5 ? 'Elit' : levelBaşlıks[level];

  // Calculate Badges
  const badges = [];
  const taskCount = completedTasks?.length || 0;
  const standupCount = standups?.length || 0;

  if (taskCount >= 1) {
    badges.push({ id: 'first_task', name: 'İlk Görev', icon: <Star size={16} color="#fbbf24" />, desc: 'Tamamlandı your first task' });
  }
  if (taskCount >= 10) {
    badges.push({ id: 'task_master', name: 'Görev Ustası', icon: <Award size={16} color="#60a5fa" />, desc: 'Tamamlandı 10 tasks' });
  }
  if (standupCount >= 1) {
    badges.push({ id: 'communicator', name: 'İletişimci', icon: <MessageSquare size={16} color="#34d399" />, desc: 'Gönderted a standup' });
  }
  if (standupCount >= 4) {
    badges.push({ id: 'streak', name: 'Seri', icon: <Flame size={16} color="#f87171" />, desc: 'Gönderted 4+ standups' });
  }
  if (level >= 5) {
    badges.push({ id: 'elite', name: 'Elit', icon: <Shield size={16} color="#a78bfa" />, desc: 'Reached Level 5' });
  }

  return { level, title, progressPercent, puanInLevel, badges };
}

export default function Profile({ user, completedTasks, standups }) {
  if (!user) return null;

  const { level, title, progressPercent, puanInLevel, badges } = calculateGamification(user, completedTasks, standups);

  const getInitial = (name) => (name || '?').charAt(0).toUpperCase();

  return (
    <div className="fade-in">
      <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          {getInitial(user.first_name)}
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{user.first_name} {user.username ? `(@${user.username})` : ''}</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {title} • Level {level}
        </div>

        {/* Level Progress */}
        <div style={{ marginTop: 24, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            <span>{user.puan} Total Puan</span>
            <span style={{ color: 'var(--text-secondary)' }}>{50 - puanInLevel} to Lvl {level + 1}</span>
          </div>
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)', width: `${progressPercent}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 24 }}>
        <div className="section-title">Badges</div>
      </div>
      
      {badges.length === 0 ? (
        <div className="empty" style={{ padding: 16 }}>No badges yet. Start claiming tasks!</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {badges.map(b => (
            <div key={b.id} className="card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {b.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-header" style={{ marginTop: 24 }}>
        <div className="section-title">Recent Activity</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {completedTasks?.slice(0, 5).map(t => (
          <div key={t.id} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={14} color="#10b981" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 22, marginTop: 4 }}>
              Tamamlandı in {t.committees?.name || 'Global'} • +{t.point_value} pts
            </div>
          </div>
        ))}
        {standups?.slice(0, 5).map(s => (
          <div key={s.id} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="#6366f1" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Gönderted Standup</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 22, marginTop: 4 }}>
              {new Date(s.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
        {(!completedTasks || completedTasks.length === 0) && (!standups || standups.length === 0) && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}
