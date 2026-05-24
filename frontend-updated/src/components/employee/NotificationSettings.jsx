export function NotificationSettings({ notificationPreferences, handlePreferenceChange, t }) {
  return (
    <div className="profile-card profile-card-modern">
      <h3>{t('page.profile.notifications')}</h3>
      <p className="profile-card-subtitle">{t('page.profile.notificationsText')}</p>

      <div className="preference-list">
        {Object.keys(notificationPreferences).map((key) => (
          <button
            key={key}
            type="button"
            className="preference-item"
            onClick={() => handlePreferenceChange(key)}
          >
            <span>{t(`profile.${key}`)}</span>
            <span className={`preference-toggle ${notificationPreferences[key] ? "on" : "off"}`}>
              {notificationPreferences[key] ? t('profile.on') : t('profile.off')}
            </span>
          </button>
        ))}
      </div>
      <p className="profile-card-subtitle" style={{ marginTop: 12 }}>
        {t('profile.preferencesAutosave')}
      </p>
    </div>
  );
}
