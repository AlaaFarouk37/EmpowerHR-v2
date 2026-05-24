import { Spinner } from '../shared/index.jsx';

export function ActivityList({ title, subtitle, activities, loading, t }) {
  return (
    <div className="profile-card profile-card-modern profile-security-activity">
      <h3>{title}</h3>
      <p className="profile-card-subtitle">{subtitle}</p>
      {loading ? (
        <div className="profile-activity-loading"><Spinner size={18} /></div>
      ) : activities.length === 0 ? (
        <div className="profile-activity-empty">{t('profile.noRecentActivity')}</div>
      ) : (
        <ul className="profile-activity-list">
          {activities.map((item) => (
            <li key={item.id} className="profile-activity-item">
              <span className="profile-activity-title">{item.title}</span>
              <span className="profile-activity-meta">{item.meta}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
