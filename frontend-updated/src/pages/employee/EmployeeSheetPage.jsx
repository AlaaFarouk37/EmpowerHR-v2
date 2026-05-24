import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAttendance,
  getMyLeaveRequests,
  getMyPayroll,
} from '../../api/index.js';
import { Badge, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_COLORS = {
  Present: 'green',
  'On Leave': 'blue',
  'Public Holiday': 'orange',
  Absent: 'red',
  Pending: 'orange',
  Approved: 'green',
  Rejected: 'red',
};

function formatAmount(value) {
  const preferredCurrency = typeof document !== 'undefined'
    ? (document.documentElement.dataset.currencyPreference || 'EGP')
    : 'EGP';
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: preferredCurrency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateWorkingHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return '';
  const inTime = new Date(`1970-01-01T${clockIn}`);
  const outTime = new Date(`1970-01-01T${clockOut}`);
  const diff = (outTime - inTime) / (1000 * 60 * 60);
  return diff > 0 ? `${diff.toFixed(2)}h` : '';
}

export function EmployeeSheetPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, resolvePath } = useAuth();
  const employeeID = user?.employee_id;

  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeID) {
      navigate(resolvePath('/'));
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [attendanceData, leaveData, payrollData] = await Promise.all([
          getMyAttendance(employeeID),
          getMyLeaveRequests(employeeID),
          getMyPayroll(employeeID),
        ]);

        setAttendance(attendanceData);
        setLeaveRequests(leaveData);
        setPayroll(payrollData);

        // Profile from user context
        setProfile({
          name: user.full_name || user.email,
          email: user.email || 'N/A',
          role: user.role || 'N/A',
        });
      } catch (error) {
        toast(error.message || 'Failed to load employee sheet data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [employeeID, user, navigate, resolvePath, toast]);

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>{t('Employee Sheet')}</h1>

      {/* Profile Section */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
          {t('Profile')}
        </summary>
        <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 5, marginTop: 10 }}>
          <p><strong>{t('Name')}:</strong> {profile?.name}</p>
          <p><strong>{t('Email')}:</strong> {profile?.email}</p>
          <p><strong>{t('Role')}:</strong> {profile?.role}</p>
        </div>
      </details>

      {/* Attendance Sheet */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
          {t('Attendance Sheet')}
        </summary>
        <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 5, marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Date')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Status')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Clock In')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Clock Out')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Working Hours')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Leave Status')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Leave Type')}</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.attendanceID}>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{record.date}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>
                    <Badge label={t(record.status)} color={STATUS_COLORS[record.status] || 'gray'} />
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatTime(record.clockIn)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatTime(record.clockOut)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{calculateWorkingHours(record.clockIn, record.clockOut)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{record.leaveStatus || ''}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{record.leaveType || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Leave Sheet */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
          {t('Leave Sheet')}
        </summary>
        <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 5, marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Leave Type')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Start Date')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('End Date')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Status')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Approved By')}</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((request) => (
                <tr key={request.leaveRequestID}>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{t(request.leaveType)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{request.startDate}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{request.endDate}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>
                    <Badge label={t(request.status)} color={STATUS_COLORS[request.status] || 'gray'} />
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{request.reviewedBy || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Salary Sheet */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }}>
          {t('Salary Sheet')}
        </summary>
        <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 5, marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Month')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Base Salary')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Deductions')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Bonus')}</th>
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Net Salary')}</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((record) => (
                <tr key={record.payrollID}>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{record.payPeriod}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatAmount(record.baseSalary)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatAmount(record.deductions)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatAmount(record.bonus)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatAmount(record.netPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}