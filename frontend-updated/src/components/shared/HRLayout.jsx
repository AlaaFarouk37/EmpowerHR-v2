import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Badge, Btn } from './index.jsx';

const ICONS = {
  dashboard: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  talent: ['M12 13a4 4 0 1 0-4-4', 'M4 20a6 6 0 0 1 12 0', 'M18 10v6', 'M15 13h6'],
  approval: ['M7 4h10v16H7z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  payroll: ['M4 7h16v10H4z', 'M7 10h3', 'M14 14h3'],
  planning: ['M5 17 10 12l3 3 6-8', 'M16 7h3v3'],
  analytics: ['M5 19V9', 'M12 19V5', 'M19 19v-7'],
  employees: ['M16 11a4 4 0 1 0-8 0', 'M4 20a8 8 0 0 1 16 0'],
  feedback: ['M5 6h14v10H8l-3 3z'],
  support: ['M6 12a6 6 0 0 1 12 0v5a2 2 0 0 1-2 2h-2', 'M6 12v4', 'M18 12v4'],
  attendance: ['M12 6v6l4 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'],
  onboarding: ['M12 19l9 2-9-18-9 18 9-2zm0 0v-8'],
  benchmarking: ['M12 3v18', 'M16 7.5c-1.2-1-2.5-1.5-4-1.5-2 0-3.5.9-3.5 2.5S10 11 12 11s3.5.7 3.5 2.5S14 17 12 17c-1.7 0-3.2-.6-4.3-1.7'],
  ranking: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']
};

export function HRIcon({ name, size = 18, className = '', stroke = 'currentColor' }) {
  const paths = ICONS[name] || ICONS.dashboard;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

export function HRLayout({ children }) {
  return (
    <div className="hr-main-container" style={{ width: '100%', maxWidth: '100%' }}>
      {children}
    </div>
  );
}
