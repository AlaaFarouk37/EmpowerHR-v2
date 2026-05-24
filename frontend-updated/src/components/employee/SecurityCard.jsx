import { Btn } from '../shared/index.jsx';

export function SecurityCard({ form, error, success, loading, handleChange, handleSubmit, t }) {
  return (
    <div className="profile-card profile-card-modern">
      <h3>{t('page.profile.security')}</h3>
      <p className="profile-card-subtitle">
        {t('page.profile.securityText')}
      </p>

      <form onSubmit={handleSubmit} className="login-form">
        {error   && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        <div className="form-group">
          <label htmlFor="old_password">{t('profile.currentPassword')}</label>
          <input
            id="old_password"
            type="password"
            name="old_password"
            value={form.old_password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="new_password">{t('profile.newPassword')}</label>
          <input
            id="new_password"
            type="password"
            name="new_password"
            value={form.new_password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm_password">{t('profile.confirmPassword')}</label>
          <input
            id="confirm_password"
            type="password"
            name="confirm_password"
            value={form.confirm_password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn-primary profile-btn-primary" disabled={loading}>
          {loading ? "Updating..." : t('profile.updatePassword')}
        </button>
      </form>
    </div>
  );
}
