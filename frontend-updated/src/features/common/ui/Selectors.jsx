import React, { useState, useEffect, useId } from 'react';
import { hrGetEmployees } from '../../../api';

let employeeDirectoryCache = null;
let employeeDirectoryPromise = null;

const loadEmployeeDirectory = async () => {
  if (employeeDirectoryCache) return employeeDirectoryCache;
  if (!employeeDirectoryPromise) {
    employeeDirectoryPromise = hrGetEmployees()
      .then((data) => {
        employeeDirectoryCache = Array.isArray(data) ? data : [];
        return employeeDirectoryCache;
      })
      .catch(() => [])
      .finally(() => {
        employeeDirectoryPromise = null;
      });
  }
  return employeeDirectoryPromise;
};

export function EmployeeSelect({
  label,
  id,
  value,
  onChange,
  onEmployeeChange,
  multiple = false,
  placeholder = 'Select an employee',
  helperText,
  size,
  style,
  disabled = false,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [employees, setEmployees] = useState(employeeDirectoryCache || []);
  const [loading, setLoading] = useState(!employeeDirectoryCache);

  useEffect(() => {
    let active = true;

    loadEmployeeDirectory()
      .then((data) => {
        if (active) setEmployees(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedValue = multiple
    ? (Array.isArray(value)
      ? value
      : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean))
    : (value || '');

  const handleChange = (event) => {
    if (multiple) {
      const selectedValues = Array.from(event.target.selectedOptions).map((option) => option.value);
      onChange?.(selectedValues);
      onEmployeeChange?.(employees.filter((employee) => selectedValues.includes(employee.employeeID)));
      return;
    }

    const nextValue = event.target.value;
    onChange?.(nextValue);
    onEmployeeChange?.(employees.find((employee) => employee.employeeID === nextValue) || null);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</label>}
      <select
        id={inputId}
        aria-label={label || 'Employee selector'}
        multiple={multiple}
        size={multiple ? (size || 6) : undefined}
        value={normalizedValue}
        onChange={handleChange}
        disabled={disabled || loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(255,255,255,.98)',
          border: '1.5px solid #E7EAEE',
          borderRadius: 'var(--control-radius)',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--gray-900)',
          outline: 'none',
          transition: 'all .2s ease',
          boxShadow: 'var(--shadow-xs)',
          minHeight: multiple ? 140 : 'auto',
          ...style,
        }}
      >
        {!multiple && <option value="">{loading ? 'Loading employees...' : placeholder}</option>}
        {employees.map((employee) => (
          <option key={employee.employeeID} value={employee.employeeID}>
            {employee.fullName} ({employee.employeeID}){employee.department ? ` — ${employee.department}` : ''}
          </option>
        ))}
      </select>
      {helperText ? <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-500)' }}>{helperText}</div> : null}
    </div>
  );
}

export function EmployeeProfileSummary({
  employee,
  t = (value) => value,
  language = 'en',
  note = 'Employee profile details were fetched for easier entry. You can still edit any field before saving.',
}) {
  if (!employee) return null;

  const preferredCurrency = employee?.currency_preference || (typeof document !== 'undefined'
    ? (document.documentElement.dataset.currencyPreference || 'EGP')
    : 'EGP');

  const formatCurrency = (value) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: preferredCurrency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

  const details = [
    ['Job Title', employee.jobTitle],
    ['Department', employee.department],
    ['Team', employee.team],
    ['Location', employee.location],
    ['Salary', employee.monthlyIncome !== null && employee.monthlyIncome !== undefined && employee.monthlyIncome !== '' ? formatCurrency(employee.monthlyIncome) : ''],
    ['Currency', employee.currency_preference],
    ['Email', employee.email],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

  return (
    <div style={{
      marginBottom: 16,
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid #E7EAEE',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>
        {employee.fullName} ({employee.employeeID})
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginBottom: details.length ? 8 : 0 }}>
        {t(note)}
      </div>
      {details.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {details.map(([label, value]) => (
            <span key={`${employee.employeeID}-${label}`} style={{
              padding: '4px 8px',
              borderRadius: 999,
              fontSize: 11.5,
              background: 'var(--bg-surface)',
              border: '1px solid #E7EAEE',
              color: 'var(--gray-700)',
            }}>
              <strong>{t(label)}:</strong> {value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
