import React from 'react';
import { Badge, Modal, Skeleton } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function EmployeeSnapshotModal({ open, onClose, employee, snapshot, loading }) {
  const { t } = useLanguage();

  return (
    <Modal open={open} onClose={onClose} title={`${t('Employee Pulse Snapshot')} - ${employee?.fullName}`} maxWidth={900}>
      {loading ? <Skeleton height={300} /> : snapshot && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
           <div className="hr-surface-card" style={{ padding: 24, borderRadius: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 20 }}>{t('Profile Intelligence')}</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                 <div style={{ fontSize: 14 }}><strong>{t('Title')}:</strong> {snapshot.employee?.jobTitle}</div>
                 <div style={{ fontSize: 14 }}><strong>{t('Email')}:</strong> {snapshot.employee?.email}</div>
                 <div style={{ fontSize: 14 }}><strong>{t('Join Date')}:</strong> {snapshot.employee?.joinDate ? new Date(snapshot.employee.joinDate).toLocaleDateString() : t('Not Set')}</div>
              </div>
           </div>
           <div className="hr-surface-card" style={{ padding: 24, borderRadius: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 20 }}>{t('Metrics Telemetry')}</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                 <div style={{ fontSize: 14 }}><strong>{t('Risk Level')}:</strong> <Badge label={snapshot.attrition?.riskLevel} color="red" size="sm" /></div>
                 <div style={{ fontSize: 14 }}><strong>{t('Attendance Rate')}:</strong> {snapshot.summary?.attendanceRate}%</div>
                 <div style={{ fontSize: 14 }}><strong>{t('Review Rating')}:</strong> {snapshot.summary?.averageReviewRating}/5</div>
              </div>
           </div>
        </div>
      )}
    </Modal>
  );
}
