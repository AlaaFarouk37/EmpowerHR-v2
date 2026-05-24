import { useState, useEffect, useMemo } from 'react';
import { hrGetPayroll, hrGetPayrollWatch } from '../../../api';
import { useToast } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function usePayroll() {
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payrollRows, setPayrollRows] = useState([]);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const [rows, watch] = await Promise.all([
        hrGetPayroll({}),
        hrGetPayrollWatch().catch(() => ({ followUpItems: [] })),
      ]);
      const followUps = watch?.followUpItems || [];
      setPayrollRows((rows || []).map((r, i) => ({
        ...r,
        visualId: `PAY-${String(r.payrollID || i + 1).padStart(4, '0')}`,
        isAnomaly: followUps.some(f => String(f.payrollID) === String(r.payrollID)),
        lane: (r.status === 'Paid' || r.status === 'Closed') ? 'closed' : (r.status === 'Draft' ? 'draft' : 'active')
      })));
    } catch (error) {
      toast(t('Failed to load payroll records'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, []);

  const stats = useMemo(() => {
    const active = payrollRows.filter(r => r.lane !== 'closed');
    return {
      totalSpend: payrollRows.reduce((s, r) => s + Number(r.netPay || 0), 0),
      pendingSpend: active.reduce((s, r) => s + Number(r.netPay || 0), 0),
      anomalies: payrollRows.filter(r => r.isAnomaly).length,
      activeCount: active.length
    };
  }, [payrollRows]);

  return { loading, payrollRows, stats, refresh: loadPayroll };
}
