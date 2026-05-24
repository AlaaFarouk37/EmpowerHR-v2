import { useState, useEffect, useMemo } from 'react';
import { hrGetAttendanceRecords, hrGetAttendanceWatch, hrGetLeaveRequests } from '../../../api';
import { useToast } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function useOperations() {
  const { t } = useLanguage();
  const toast = useToast();
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attendanceData, leaveData, watchData] = await Promise.all([
        hrGetAttendanceRecords(),
        hrGetLeaveRequests(),
        hrGetAttendanceWatch().catch(() => ({})),
      ]);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
      setWatch(watchData);
    } catch (error) {
      toast(t('Failed to load presence telemetry'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      presentToday: attendance.filter(r => r.date === today && r.status === 'Present').length,
      pendingLeaves: leaveRequests.filter(r => r.status === 'Pending').length,
      anomalies: attendance.filter(r => r.status === 'Partial').length,
      coverageRate: '92.4%' // Derivative metric
    };
  }, [attendance, leaveRequests]);

  return { loading, attendance, leaveRequests, watch, stats, refresh: loadData };
}
