import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAttendance,
  getMyLeaveRequests,
  getMyPayroll,
  getMyProfile,
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

// clockIn/clockOut arrive as ISO datetimes from the backend.
function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatWorkedHours(workedHours) {
  if (workedHours == null || workedHours === '') return '—';
  return `${Number(workedHours).toFixed(2)}h`;
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
        const [attendanceData, leaveData, payrollData, profileData] = await Promise.all([
          getMyAttendance(employeeID).catch(() => []),
          getMyLeaveRequests(employeeID).catch(() => []),
          getMyPayroll(employeeID).catch(() => []),
          getMyProfile().catch(() => null),
        ]);

        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
        setPayroll(Array.isArray(payrollData) ? payrollData : []);

        // Real employee record, falling back to the auth user context.
        setProfile({
          name: profileData?.fullName || user.full_name || user.email,
          employeeID: profileData?.employeeID || employeeID,
          email: profileData?.email || user.email || 'N/A',
          role: profileData?.role || user.role || 'N/A',
          jobTitle: profileData?.jobTitle || 'N/A',
          department: profileData?.departmentName || 'N/A',
          team: profileData?.teamName || 'N/A',
          manager: profileData?.managerName || 'N/A',
          phone: profileData?.phoneNumber || 'N/A',
          location: profileData?.location || 'N/A',
          hireDate: profileData?.hiring_date || 'N/A',
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
          <p><strong>{t('Employee ID')}:</strong> {profile?.employeeID}</p>
          <p><strong>{t('Email')}:</strong> {profile?.email}</p>
          <p><strong>{t('Job Title')}:</strong> {profile?.jobTitle}</p>
          <p><strong>{t('Role')}:</strong> {profile?.role}</p>
          <p><strong>{t('Department')}:</strong> {profile?.department}</p>
          <p><strong>{t('Team')}:</strong> {profile?.team}</p>
          <p><strong>{t('Manager')}:</strong> {profile?.manager}</p>
          <p><strong>{t('Phone')}:</strong> {profile?.phone}</p>
          <p><strong>{t('Location')}:</strong> {profile?.location}</p>
          <p><strong>{t('Hire Date')}:</strong> {profile?.hireDate}</p>
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
                <th style={{ border: '1px solid #ddd', padding: 8 }}>{t('Overtime')}</th>
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
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatWorkedHours(record.workedHours)}</td>
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{Number(record.overtimeHours) > 0 ? `${Number(record.overtimeHours).toFixed(2)}h` : '—'}</td>
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
                  <td style={{ border: '1px solid #ddd', padding: 8 }}>{formatAmount(record.commissions)}</td>
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