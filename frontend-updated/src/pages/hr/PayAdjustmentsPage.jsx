import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hrGetCommissions, hrCreateCommission, hrDeleteCommission,
  hrGetDeductions, hrCreateDeduction, hrDeleteDeduction,
} from '../../api/index.js';
import {
  Btn, Spinner, useToast, Input, Textarea, Modal, EmployeeSelect,
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { TrendingUp, TrendingDown, Plus, Trash2, DollarSign, Calendar } from 'lucide-react';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const TABS = {
  commission: {
    key: 'commission',
    label: 'Commissions',
    sign: '+',
    accent: '#16A34A',
    accentBg: '#F0FDF4',
    icon: TrendingUp,
    blurb: 'Manual additions to pay (bonuses, sales commissions). Added to net pay.',
  },
  deduction: {
    key: 'deduction',
    label: 'Deductions',
    sign: '−',
    accent: 'var(--red-600)',
    accentBg: 'var(--red-50)',
    icon: TrendingDown,
    blurb: 'Manual subtractions from pay (penalties, recoveries). Subtracted from net pay. Unpaid-leave is handled automatically and is not entered here.',
  },
};

export function HRPayAdjustmentsPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('commission');
  const [commissions, setCommissions] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ employeeID: '', payPeriod: currentPeriod(), amount: '', description: '' });

  const tab = TABS[activeTab];
  const rows = activeTab === 'commission' ? commissions : deductions;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([hrGetCommissions(), hrGetDeductions()]);
      setCommissions(Array.isArray(c) ? c : []);
      setDeductions(Array.isArray(d) ? d : []);
    } catch (e) {
      toast(t('Failed to load pay adjustments'), 'error');
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ employeeID: '', payPeriod: currentPeriod(), amount: '', description: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeID) { toast(t('Please select an employee'), 'error'); return; }
    if (!/^\d{4}-\d{2}$/.test(form.payPeriod)) { toast(t('Pay period must be in YYYY-MM format'), 'error'); return; }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) { toast(t('Enter a valid amount greater than 0'), 'error'); return; }
    if (!form.description.trim()) { toast(t('Please add a note explaining why'), 'error'); return; }

    const payload = {
      employeeID: form.employeeID,
      payPeriod: form.payPeriod,
      amount: amountNum,
      description: form.description.trim(),
    };
    setSaving(true);
    try {
      const create = activeTab === 'commission' ? hrCreateCommission : hrCreateDeduction;
      await create(payload);
      toast(t(`${tab.label.slice(0, -1)} recorded`), 'success');
      setModalOpen(false);
      await load();
    } catch (e) {
      toast(e?.message || t('Failed to save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const id = row.commissionID || row.deductionID;
    if (!id || deletingId) return;
    if (!window.confirm(t('Delete this entry? It will no longer be included when payroll is generated.'))) return;
    setDeletingId(id);
    try {
      const del = activeTab === 'commission' ? hrDeleteCommission : hrDeleteDeduction;
      await del(id);
      toast(t('Entry deleted'), 'success');
      await load();
    } catch (e) {
      toast(e?.message || t('Failed to delete'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.amount || 0), 0),
    [rows],
  );

  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(Number(val || 0));

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size={48} /></div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center' }}>
              <DollarSign size={22} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('Commissions & Deductions')}</h1>
          </div>
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, margin: 0 }}>
            {t('Manually record pay adjustments. These are picked up automatically when you generate payroll for the matching pay period.')}
          </p>
        </div>
        <Btn onClick={openCreate} variant="primary" style={{ height: 46, borderRadius: 12, padding: '0 22px', fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>
          <Plus size={18} style={{ marginRight: 8 }} /> {t(`Add ${tab.label.slice(0, -1)}`)}
        </Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {Object.values(TABS).map((tDef) => {
          const isActive = activeTab === tDef.key;
          const Icon = tDef.icon;
          return (
            <button
              key={tDef.key}
              onClick={() => setActiveTab(tDef.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 22px', borderRadius: 14, cursor: 'pointer',
                border: `1.5px solid ${isActive ? tDef.accent : '#F1F5F9'}`,
                background: isActive ? tDef.accentBg : '#fff',
                color: isActive ? tDef.accent : '#64748B', fontWeight: 800, fontSize: 14, transition: 'all .2s',
              }}
            >
              <Icon size={18} /> {t(tDef.label)}
              <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 900, background: isActive ? '#fff' : '#F1F5F9', borderRadius: 999, padding: '2px 8px' }}>
                {tDef.key === 'commission' ? commissions.length : deductions.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', background: '#fff', borderRadius: 18, border: '1.5px solid #F1F5F9', marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: tab.accentBg, color: tab.accent, display: 'grid', placeItems: 'center' }}>
          <tab.icon size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(`Total ${tab.label}`)}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: tab.accent }}>{tab.sign} {formatMoney(total)}</div>
        </div>
        <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 600, maxWidth: 420, textAlign: 'right' }}>{t(tab.blurb)}</div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
            {t(`No ${tab.label.toLowerCase()} recorded yet.`)}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
                {['Employee', 'Pay Period', 'Amount', 'Note', 'Recorded By', ''].map((h) => (
                  <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = row.commissionID || row.deductionID;
                return (
                  <tr key={id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                          {(row.employeeName || '?').charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{row.employeeName || row.employee}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{row.employee}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#475569' }}>
                        <Calendar size={13} style={{ color: '#94A3B8' }} /> {row.payPeriod}
                      </span>
                    </td>
                    <td style={{ padding: '18px 24px', fontSize: 15, fontWeight: 900, color: tab.accent }}>
                      {tab.sign} {formatMoney(row.amount)}
                    </td>
                    <td style={{ padding: '18px 24px', fontSize: 13, color: '#475569', fontWeight: 600, maxWidth: 320 }}>
                      {row.description || <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    <td style={{ padding: '18px 24px', fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>{row.createdBy || '—'}</td>
                    <td style={{ padding: '18px 24px' }}>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={deletingId === id}
                        title={t('Delete')}
                        style={{ width: 34, height: 34, border: '1.5px solid #F1F5F9', background: '#fff', color: '#94A3B8', borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t(`Add ${tab.label.slice(0, -1)}`)}>
        <EmployeeSelect
          label={t('Employee')}
          value={form.employeeID}
          onChange={(val) => setForm((f) => ({ ...f, employeeID: val }))}
        />
        <Input
          label={t('Pay Period (YYYY-MM)')}
          type="month"
          value={form.payPeriod}
          onChange={(e) => setForm((f) => ({ ...f, payPeriod: e.target.value }))}
        />
        <Input
          label={t('Amount (EGP)')}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
        <Textarea
          label={t('Note — why is this being applied?')}
          placeholder={activeTab === 'commission' ? t('e.g. Q2 sales commission') : t('e.g. Company laptop damage recovery')}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>{t('Cancel')}</Btn>
          <Btn variant="primary" loading={saving} onClick={handleSave} style={{ background: 'var(--red-600)', border: 'none' }}>
            {t('Save')}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
