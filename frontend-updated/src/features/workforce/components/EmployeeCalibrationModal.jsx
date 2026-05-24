import React from 'react';
import { Btn, Modal } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function EmployeeCalibrationModal({ open, onClose, form, setForm, onConfirm, saving }) {
  const { t } = useLanguage();

  return (
    <Modal open={open} onClose={onClose} title={t('Neural Role Calibration')} maxWidth={500}>
      <div style={{ display: 'grid', gap: 20 }}>
         <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>{t('Calibration Type')}</label>
            <select 
              value={form.type} 
              onChange={e => setForm(p => ({...p, type: e.target.value}))} 
              className="hr-form-control" 
              style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid var(--border-soft)', padding: '0 16px' }}
            >
               <option value="Promotion">{t('Promotion')}</option>
               <option value="Demotion">{t('Demotion')}</option>
               <option value="Transfer">{t('Transfer')}</option>
            </select>
         </div>
         <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>{t('Target Title')}</label>
            <input 
              value={form.newTitle} 
              onChange={e => setForm(p => ({...p, newTitle: e.target.value}))} 
              className="hr-form-control" 
              style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid var(--border-soft)', padding: '0 16px' }} 
            />
         </div>
         <Btn 
           variant="primary" 
           style={{ height: 48, borderRadius: 14, background: 'var(--gray-900)', color: 'white' }} 
           onClick={onConfirm} 
           disabled={saving}
         >
            {saving ? t('Syncing Matrix...') : t('Confirm Calibration')}
         </Btn>
      </div>
    </Modal>
  );
}
