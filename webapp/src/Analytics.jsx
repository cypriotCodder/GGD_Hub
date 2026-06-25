import React, { useMemo } from 'react';
import { PieChart, Users, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function Analytics({ data }) {
  const { tasks = [], standups = [], users = [] } = data;

  const stats = useMemo(() => {
    // 1. Task Completion Rate
    const assignedTasks = tasks.filter(t => t.status !== 'cancelled');
    const completedTasks = assignedTasks.filter(t => t.status === 'completed');
    const completionRate = assignedTasks.length > 0 
      ? Math.round((completedTasks.length / assignedTasks.length) * 100) 
      : 0;

    // 2. Blockers
    const blockers = standups.filter(s => {
      if (!s.blockers) return false;
      const lower = s.blockers.toLowerCase().trim();
      return lower !== 'none' && lower !== 'yok' && lower !== 'no' && lower !== '';
    }).slice(0, 10); // get top 10 most recent blockers

    // 3. Inactive Members (14 Days)
    const INACTIVE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();

    const inactiveUsers = users.map(user => {
      // Find latest task
      const userTasks = tasks.filter(t => t.assigned_to === user.telegram_id && t.status === 'completed');
      const latestTaskTime = userTasks.length > 0 
        ? Math.max(...userTasks.map(t => new Date(t.created_at).getTime()))
        : 0;
      
      // Find latest standup
      const userStandups = standups.filter(s => s.user_id === user.telegram_id);
      const latestStandupTime = userStandups.length > 0
        ? Math.max(...userStandups.map(s => new Date(s.created_at).getTime()))
        : 0;

      const lastActivityTime = Math.max(latestTaskTime, latestStandupTime, new Date(user.created_at).getTime());
      const daysSinceActive = Math.floor((now - lastActivityTime) / (1000 * 60 * 60 * 24));
      
      return { ...user, daysSinceActive, isInactive: (now - lastActivityTime) > INACTIVE_THRESHOLD_MS };
    }).filter(u => u.isInactive).sort((a, b) => b.daysSinceActive - a.daysSinceActive);

    return {
      assignedTasksCount: assignedTasks.length,
      completedTasksCount: completedTasks.length,
      completionRate,
      blockers,
      inactiveUsers
    };
  }, [tasks, standups, users]);

  return (
    <div className="fade-in">
      <div className="section-header" style={{ marginTop: 0 }}>
        <div className="section-title">Overview</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <PieChart size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.completionRate}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Task Completion</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {stats.completedTasksCount} / {stats.assignedTasksCount} tasks
          </div>
        </div>

        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Users size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.inactiveUsers.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Inactive Members</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>14+ days no activity</div>
        </div>
      </div>

      {stats.blockers.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={18} /> Recent Blockers
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: '#fecaca' }}>
            {stats.blockers.map(b => {
              const user = users.find(u => u.telegram_id === b.user_id);
              return (
                <div key={b.id} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.first_name || 'Unknown'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#b91c1c' }}>{b.blockers}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="section-header" style={{ marginTop: 24 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={18} /> Inactive Volunteers
        </div>
      </div>
      
      {stats.inactiveUsers.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎉</div>
          Everyone is active!
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {stats.inactiveUsers.map(u => (
            <div key={u.telegram_id} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{u.first_name} {u.username ? `(@${u.username})` : ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.puan} total puan</div>
                </div>
                <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
                  {u.daysSinceActive} days ago
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
