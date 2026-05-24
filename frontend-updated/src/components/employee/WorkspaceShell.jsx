import { Btn } from '../shared/index.jsx';

export function WorkspaceShell({ t, openTasks, activeGoals, activeTraining, openRequests, navigate, resolvePath }) {
  return (
    <div className="hr-surface-card workspace-shell-card workspace-shell-employee" style={{ padding: 18, marginBottom: 24 }}>
      <div className="workspace-shell-topline">{t('My Workspace')}</div>
      <div className="workspace-shell-header">
        <div className="workspace-shell-copy">
          <div className="workspace-shell-title">{t('Self-Service Snapshot')}</div>
          <div className="workspace-shell-subtitle">{t('Stay on top of your workday, growth, and open service requests from one place.')}</div>
          <div className="workspace-shell-meta">
            <span>{t('Open Tasks')}: {openTasks}</span>
            <span>{t('Active Goals')}: {activeGoals}</span>
            <span>{t('Learning In Motion')}: {activeTraining}</span>
            <span>{t('Open Requests')}: {openRequests}</span>
          </div>
        </div>
        <div className="workspace-shell-actions">
          <Btn size="sm" variant="ghost" onClick={() => navigate(resolvePath('/employee/profile'))}>{t('nav.profile')}</Btn>
          <Btn size="sm" variant="ghost" onClick={() => navigate(resolvePath('/employee/career-path'))}>{t('nav.careerPath')}</Btn>
          <Btn size="sm" variant="ghost" onClick={() => navigate(resolvePath('/employee/training'))}>{t('nav.training')}</Btn>
        </div>
      </div>
      <div className="workspace-shell-focus">
        <div className="workspace-focus-card">
          <div className="workspace-focus-label">{t("Today's Priority")}</div>
          <div className="workspace-focus-note">{t('Stay ahead of your requests, goals, and workday follow-up from one clean workspace.')}</div>
        </div>
        <div className="workspace-focus-card">
          <div className="workspace-focus-label">{t('Growth Checklist')}</div>
          <div className="workspace-chip-list">
            {[t('Review career path'), t('Check latest feedback'), t('Continue learning')].map((item) => (
              <span key={item} className="workspace-chip">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
