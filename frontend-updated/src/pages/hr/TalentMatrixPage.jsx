import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetTalentMatrix, hrCalibrateTalent } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input, Textarea } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Star, 
  TrendingUp, 
  Zap, 
  Activity, 
  Grid,
  List,
  Edit3,
  ChevronRight,
  Shield,
  Search,
  Maximize2,
  ChevronLeft,
  Sparkles,
  Target,
  Brain,
  X
} from 'lucide-react';

const BOX_NAMES = {
  '3,3': 'Star Player',
  '3,2': 'High Professional',
  '2,3': 'High Potential',
  '3,1': 'Solid Professional',
  '2,2': 'Core Talent',
  '1,3': 'Enigma',
  '2,1': 'Effective',
  '1,2': 'Inconsistent',
  '1,1': 'Under Performer'
};

const BOX_DESCRIPTIONS = {
  'Star Player': 'High performance, high potential nodes.',
  'High Professional': 'Consistent output with scaling capacity.',
  'High Potential': 'Future leadership candidates with high agility.',
  'Core Talent': 'Stable operational backbone of the organization.',
  'Enigma': 'High potential currently under-performing.'
};

export function TalentMatrixPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'ledger'
  const [calibratingNode, setCalibratingNode] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrGetTalentMatrix();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      toast('Failed to load talent matrix intelligence', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCalibrate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: calibratingNode.employee_id,
      performance: formData.get('performance'),
      potential: formData.get('potential'),
      notes: formData.get('notes')
    };

    try {
      await hrCalibrateTalent(data);
      toast('Talent node recalibrated successfully', 'success');
      setCalibratingNode(null);
      loadData();
    } catch (err) {
      toast('Recalibration failed', 'error');
    }
  };

  const getBoxCoords = (perf, pot) => {
    const p = perf >= 4.5 ? 3 : (perf >= 3.5 ? 2 : 1);
    const po = pot >= 4.5 ? 3 : (pot >= 3.5 ? 2 : 1);
    return `${p},${po}`;
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>CALIBRATING TALENT GRID...</div>
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
                 <Brain size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Strategic Talent Matrix</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Calibrate organizational performance and potential density via Neural 9-Box mapping.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
           <div style={{ background: '#fff', borderRadius: 12, padding: 4, border: '1.5px solid #F1F5F9', display: 'flex', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ 
                  padding: '10px 20px', borderRadius: 10, border: 'none', 
                  background: viewMode === 'grid' ? '#1E293B' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : '#64748B',
                  fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                 <Grid size={16} /> Grid
              </button>
              <button 
                onClick={() => setViewMode('ledger')}
                style={{ 
                  padding: '10px 20px', borderRadius: 10, border: 'none', 
                  background: viewMode === 'ledger' ? '#1E293B' : 'transparent',
                  color: viewMode === 'ledger' ? '#fff' : '#64748B',
                  fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                 <List size={16} /> Ledger
              </button>
           </div>
           <Btn variant="primary" style={{ height: 48, borderRadius: 14, padding: '0 24px', background: 'var(--red-600)', border: 'none', fontWeight: 900 }}>
              <Zap size={18} style={{ marginRight: 8 }} /> {t('Trigger Auto-Calibration')}
           </Btn>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ position: 'relative', height: '800px', display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr 40px', gap: 20 }}>
           {/* Axis Labels */}
           <div style={{ gridRow: '1/4', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontWeight: 900, fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.2em', writingMode: 'vertical-rl', rotate: '180deg', position: 'relative' }}>
              <div style={{ position: 'absolute', height: '100%', width: 2, background: 'linear-gradient(to top, var(--red-600), transparent)', left: 0 }} />
              Potential Capability
           </div>
           
           {/* The 9-Box Grid */}
           {[3, 2, 1].map(potLevel => (
              [1, 2, 3].map(perfLevel => {
                const boxKey = `${perfLevel},${potLevel}`;
                const boxName = BOX_NAMES[boxKey];
                const boxEmployees = employees.filter(emp => getBoxCoords(emp.performance_score, emp.potential_score) === boxKey);
                const isPremium = boxKey === '3,3';

                return (
                  <div key={boxKey} style={{ 
                    background: isPremium ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' : '#fff', 
                    borderRadius: 28, border: isPremium ? 'none' : '1.5px solid #F1F5F9', 
                    padding: 24, display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 0.3s',
                    boxShadow: isPremium ? '0 20px 40px -10px rgba(15, 23, 42, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.02)',
                    position: 'relative', overflow: 'hidden'
                  }}>
                    {isPremium && <Sparkles size={16} style={{ position: 'absolute', top: 20, right: 20, color: 'var(--red-600)', opacity: 0.5 }} />}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div style={{ fontSize: 11, fontWeight: 900, color: isPremium ? 'var(--red-500)' : '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{boxName}</div>
                       <Badge label={boxEmployees.length} color={isPremium ? 'red' : 'gray'} style={{ fontSize: 10 }} />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'start', flex: 1 }}>
                       {boxEmployees.map(emp => (
                         <div 
                           key={emp.employee_id}
                           onClick={() => setCalibratingNode(emp)}
                           style={{ 
                             width: 44, height: 44, borderRadius: 14, background: isPremium ? 'rgba(255,255,255,0.05)' : '#F8FAFC', 
                             display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 900, 
                             color: isPremium ? '#fff' : 'var(--red-600)', cursor: 'pointer',
                             border: isPremium ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #F1F5F9',
                             transition: 'all 0.2s'
                           }}
                           className="talent-node"
                           title={`${emp.full_name} | Perf: ${emp.performance_score} Pot: ${emp.potential_score}`}
                         >
                            {emp.full_name.charAt(0)}
                         </div>
                       ))}
                       {boxEmployees.length === 0 && (
                         <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', opacity: 0.3 }}>
                            <Target size={24} style={{ color: isPremium ? '#fff' : '#94A3B8' }} />
                         </div>
                       )}
                    </div>

                    {BOX_DESCRIPTIONS[boxName] && (
                      <div style={{ fontSize: 10, color: isPremium ? 'rgba(255,255,255,0.4)' : '#94A3B8', fontWeight: 600, fontStyle: 'italic' }}>
                         {BOX_DESCRIPTIONS[boxName]}
                      </div>
                    )}
                  </div>
                );
              })
           ))}

           {/* X-Axis Labels */}
           <div style={{ gridColumn: '2/5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 900, fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.2em', position: 'relative' }}>
              <div style={{ position: 'absolute', width: '100%', height: 2, background: 'linear-gradient(to right, transparent, var(--red-600))', top: 0 }} />
              Operational Performance
           </div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
                {['Node', 'Performance', 'Potential', 'Neural Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const boxKey = getBoxCoords(emp.performance_score, emp.potential_score);
                const isStar = boxKey === '3,3';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                    <td style={{ padding: '24px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: isStar ? 'var(--red-600)' : 'var(--red-50)', display: 'grid', placeItems: 'center', color: isStar ? '#fff' : 'var(--red-600)', fontWeight: 900, fontSize: 15 }}>
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{emp.full_name}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{emp.position}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden', minWidth: 100 }}>
                             <div style={{ width: `${emp.performance_score * 20}%`, height: '100%', background: 'var(--red-600)' }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 900 }}>{emp.performance_score}</span>
                       </div>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden', minWidth: 100 }}>
                             <div style={{ width: `${emp.potential_score * 20}%`, height: '100%', background: 'var(--red-400)' }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 900 }}>{emp.potential_score}</span>
                       </div>
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                      <Badge label={BOX_NAMES[boxKey]} color={isStar ? 'red' : 'indigo'} />
                    </td>
                    <td style={{ padding: '24px 32px' }}>
                      <button onClick={() => setCalibratingNode(emp)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.2s' }} title="Calibrate Node">
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Calibration Overlay */}
      {calibratingNode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 14, 20, 0.4)', backdropFilter: 'blur(20px)', display: 'grid', placeItems: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', width: 520, padding: 48, borderRadius: 32, boxShadow: '0 50px 100px -20px rgba(0,0,0,0.2)', border: '1.5px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
               <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', margin: 0 }}>Neural Recalibration</h2>
               <button onClick={() => setCalibratingNode(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                  <X size={24} />
               </button>
            </div>
            
            <form onSubmit={handleCalibrate} style={{ display: 'grid', gap: 32 }}>
               <div style={{ display: 'flex', gap: 24, alignItems: 'center', padding: 24, background: '#F8FAFC', borderRadius: 20, border: '1.5px solid #F1F5F9' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--red-600)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, fontWeight: 900 }}>
                     {calibratingNode.full_name.charAt(0)}
                  </div>
                  <div>
                     <div style={{ fontSize: 18, fontWeight: 900 }}>{calibratingNode.full_name}</div>
                     <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>{calibratingNode.position}</div>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <Input label="Performance Index (1-5)" name="performance" type="number" min="1" max="5" defaultValue={calibratingNode.performance_score} step="0.5" style={{ height: 52, borderRadius: 12 }} />
                  <Input label="Potential Index (1-5)" name="potential" type="number" min="1" max="5" defaultValue={calibratingNode.potential_score} step="0.5" style={{ height: 52, borderRadius: 12 }} />
               </div>
               
               <Textarea label="Strategic Justification" name="notes" placeholder="Detailed rationale for node movement..." style={{ minHeight: 120, borderRadius: 16 }} />

               <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                  <Btn onClick={() => setCalibratingNode(null)} variant="secondary" style={{ flex: 1, height: 56, borderRadius: 16, fontWeight: 800 }}>Cancel</Btn>
                  <Btn type="submit" variant="primary" style={{ flex: 1, background: '#1E293B', height: 56, borderRadius: 16, border: 'none', fontWeight: 900 }}>Authorize Calibration</Btn>
               </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .talent-node:hover { transform: translateY(-4px) scale(1.1); box-shadow: 0 10px 20px -5px rgba(220, 38, 38, 0.3); border-color: var(--red-400); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
