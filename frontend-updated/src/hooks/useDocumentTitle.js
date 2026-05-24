import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export function useDocumentTitle() {
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'EmpowerHR';

    // Role-based title mapping
    if (path.includes('/admin')) {
      title = `${t('nav.dashboard')} | Admin Command Center`;
    } else if (path.includes('/hr')) {
      title = `${t('nav.dashboard')} | HR Workforce Hub`;
    } else if (path.includes('/leader')) {
      title = `${t('nav.dashboard')} | Team Leaderboard`;
    } else if (path.includes('/employee')) {
      title = `${t('nav.dashboard')} | My Workspace`;
    } else if (path.includes('/candidate')) {
      title = `${t('nav.jobs')} | Career Portal`;
    }

    // Specific page overrides can be added here if needed
    if (path.includes('/attrition')) title = `${t('nav.attritionCommand')} | EmpowerHR AI`;
    if (path.includes('/benchmarking')) title = `${t('nav.salaryBenchmarking')} | EmpowerHR AI`;
    if (path.includes('/intelligence')) title = `Neural Intelligence | Admin`;

    document.title = title;
  }, [location, t]);
}
