import { useState, useEffect, useMemo } from 'react';
import { hrGetShifts, hrGetEmployees, hrCreateShift } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext';
import { Badge, Btn, Spinner, useToast, Modal, Input, Textarea } from '../../components/shared/index.jsx';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Filter,
  Search,
  Plus,
  Zap,
  Info,
  ShieldAlert,
  Target,
  Activity,
  Layers,
  Globe,
  ChevronDown,
  Sparkles,
  MoreVertical,
  Activity as PulseIcon
} from 'lucide-react';

export function HRShiftsPage() {
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMPTY_SHIFT = { employeeID: '', shiftDate: '', shiftType: 'Day', startTime: '09:00', endTime: '17:00', location: '', status: 'Planned', notes: '' };
  const [createForm, setCreateForm] = useState(EMPTY_SHIFT);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrGetShifts();
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load logistics nodes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!authLoading && user) {
      loadData(); 
    }
  }, [authLoading, user]);

  const handleCreate = async () => {
    if (!createForm.employeeID.trim()) { toast('Employee ID is required', 'error'); return; }
    if (!createForm.shiftDate) { toast('Shift date is required', 'error'); return; }
    if (!createForm.startTime || !createForm.endTime) { toast('Start and end times are required', 'error'); return; }
    setSaving(true);
    try {
      await hrCreateShift(createForm);
      toast('Shift scheduled', 'success');
      setShowCreate(false);
      setCreateForm(EMPTY_SHIFT);
      await loadData();
    } catch (err) {
      toast(err?.message || 'Failed to schedule shift', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchesSearch = s.employeeName?.toLowerCase().includes(search.toLowerCase()) || 
                            s.shiftType?.toLowerCase().includes(search.toLowerCase());
      const matchesConflict = showConflictsOnly ? (s.conflicts && s.conflicts.length > 0) : true;
      return matchesSearch && matchesConflict;
    });
  }, [shifts, search, showConflictsOnly]);

  const logisticsStats = useMemo(() => {
    return [
      { label: 'Global Deployments', value: shifts.length, icon: Layers, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Active Today', value: shifts.filter(s => s.shiftDate === new Date().toISOString().split('T')[0]).length, icon: Zap, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Logistics Conflicts', value: shifts.filter(s => s.conflicts?.length > 0).length, icon: ShieldAlert, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Coverage Index', value: '98.4%', icon: Target, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [shifts]);

  if (loading || authLoading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING LOGISTICS GRID...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
                 <Layers size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Labor Logistics & Shifts</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Neural conflict detection and tactical workforce deployment matrix.</p>
        </div>

        <Btn 
          onClick={() => { setCreateForm(EMPTY_SHIFT); setShowCreate(true); }}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Plus size={18} style={{ marginRight: 8 }} /> Schedule Deployment
        </Btn>
      </div>

      {/* Logistics Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {logisticsStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search logistics nodes..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 44, padding: '0 16px 0 48px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 600, width: 320, outline: 'none' }} 
              />
           </div>
           
           <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ 
                width: 44, height: 24, borderRadius: 12, background: showConflictsOnly ? 'var(--red-600)' : '#E2E8F0', 
                position: 'relative', transition: 'all 0.2s' 
              }}>
                <input 
                  type="checkbox" 
                  checked={showConflictsOnly} 
                  onChange={(e) => setShowConflictsOnly(e.target.checked)}
                  style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }}
                />
                <div style={{ 
                  width: 18, height: 18, borderRadius: '50%', background: '#fff', 
                  position: 'absolute', top: 3, left: showConflictsOnly ? 23 : 3, transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: showConflictsOnly ? 'var(--red-600)' : '#64748B' }}>Conflicts Only</span>
           </label>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
           <Btn variant="secondary" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Filter size={16} style={{ marginRight: 8 }} /> Advanced Matrix
           </Btn>
           <Btn variant="outline" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Globe size={16} style={{ marginRight: 8 }} /> Global Roster
           </Btn>
        </div>
      </div>

      {/* Neural Logistics Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Workforce Node', 'Deployment Window', 'Operational Site', 'Status', 'Logistics Audit'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredShifts.map((s, idx) => {
              const hasConflict = s.conflicts && s.conflicts.length > 0;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: hasConflict ? 'rgba(220, 38, 38, 0.02)' : 'transparent', transition: 'background 0.2s' }} className="logistics-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: hasConflict ? 'var(--red-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)',
                        fontSize: 16, fontWeight: 900
                      }}>
                         {s.employeeName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{s.employeeName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{s.department}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: '#1E293B' }}>
                        <Clock size={14} style={{ color: 'var(--red-600)' }} /> {s.startTime.slice(0,5)} - {s.endTime.slice(0,5)}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{s.shiftDate} • {s.shiftType}</div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                      <MapPin size={14} style={{ color: 'var(--red-600)' }} /> {s.location || 'Tactical HQ'}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <Badge label={s.status.toUpperCase()} color={s.status === 'Confirmed' ? 'green' : 'indigo'} />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    {hasConflict ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red-800)', fontSize: 13, fontWeight: 900 }}>
                        <div className="conflict-pulsar" />
                        NODE CONFLICT
                        <div className="tooltip-trigger" style={{ position: 'relative', cursor: 'help' }}>
                          <Info size={16} style={{ color: '#94A3B8' }} />
                          <div className="tooltip-content" style={{ 
                            position: 'absolute', bottom: '100%', right: 0, 
                            background: '#0B0E14', color: '#fff', padding: '16px', borderRadius: 16, width: 240, 
                            zIndex: 100, visibility: 'hidden', opacity: 0, transition: 'all 0.2s', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--red-600)', marginBottom: 8, textTransform: 'uppercase' }}>Conflict Details</div>
                            {s.conflicts.map((c, i) => <div key={i} style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>• {c}</div>)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-800)', fontSize: 13, fontWeight: 900 }}>
                        <ShieldAlert size={16} /> VERIFIED
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .logistics-row:hover { background: #FBFBFF; }
        .conflict-pulsar { width: 8px; height: 8px; border-radius: 50%; background: var(--red-600); animation: pulse 1.5s infinite; }
        .tooltip-trigger:hover .tooltip-content {
          visibility: visible !important;
          opacity: 1 !important;
          transform: translateY(-12px) !important;
        }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Schedule Shift" maxWidth={620}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Employee ID" value={createForm.employeeID} onChange={(e) => setCreateForm({ ...createForm, employeeID: e.target.value })} placeholder="EMP-001" />
            <Input label="Shift Date" type="date" value={createForm.shiftDate} onChange={(e) => setCreateForm({ ...createForm, shiftDate: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>Shift Type</label>
              <select value={createForm.shiftType} onChange={(e) => setCreateForm({ ...createForm, shiftType: e.target.value })} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px' }}>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
                <option value="Split">Split</option>
                <option value="On-Call">On-Call</option>
              </select>
            </div>
            <Input label="Start Time" type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} />
            <Input label="End Time" type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} />
          </div>
          <Input label="Location" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} placeholder="HQ / Remote / Site A" />
          <Textarea label="Notes" value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
          <Btn onClick={handleCreate} disabled={saving}>{saving ? 'Scheduling...' : 'Schedule Shift'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
