import { useState, useEffect, useMemo } from 'react';
import { getMyPayroll } from '../../../api';
import { useToast } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function useMyPayroll(employeeId) {
  const { t } = useLanguage();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayroll = async () => {
      if (!employeeId) return;
      setLoading(true);
      try {
        const data = await getMyPayroll(employeeId);
        setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        toast(error.message || t('Failed to load payroll records'), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadPayroll();
  }, [employeeId]);

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYearRecords = records.filter(r => r.payPeriod && r.payPeriod.startsWith(currentYear.toString()));
    
    const gross = thisYearRecords.reduce((sum, r) => sum + parseFloat(r.baseSalary || 0) + parseFloat(r.allowances || 0) + parseFloat(r.bonus || 0), 0);
    const net = thisYearRecords.reduce((sum, r) => sum + parseFloat(r.netPay || 0), 0);
    const deductions = thisYearRecords.reduce((sum, r) => sum + parseFloat(r.deductions || 0), 0);

    return {
      gross: gross.toLocaleString(),
      net: net.toLocaleString(),
      deductions: deductions.toLocaleString(),
      currency: records[0]?.currency || 'EGP'
    };
  }, [records]);

  const latestPayment = useMemo(() => {
    if (records.length === 0) return null;
    return [...records].sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
  }, [records]);

  return { loading, records, stats, latestPayment };
}
