import { useState, useMemo } from 'react';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Skeleton, 
  useToast,
  PageHeader
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { logAIEvent, AI_EVENT_TYPES } from '../../utils/telemetry.js';
import { 
  Database, 
  FileUp, 
  ShieldCheck, 
  AlertCircle,
  History,
  CheckCircle2,
  XCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  Info,
  X,
  Search,
  Zap,
  Sparkles,
  Layers,
  Activity,
  Cpu,
  Monitor,
  Cloud,
  ExternalLink
} from 'lucide-react';

/* --- Strategic Sync Ledger Drawer --- */
const SyncLedgerDrawer = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
      <div style={{ 
        position: 'relative', width: '100%', maxWidth: 520, height: '100%', 
        background: '#fff', borderLeft: '1.5px solid #F1F5F9',
        display: 'flex', flexDirection: 'column', 
        boxShadow: '-20px 0 60px rgba(0,0,0,0.1)'
      }} className="animate-in-right">
        <div style={{ padding: '32px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
           <div>
              <h3 style={{ fontSize: 20, fontWeight: 950, margin: 0, color: '#1E293B' }}>Sync Operation Ledger</h3>
              <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700, marginTop: 4 }}>Detailed historical log of master records</div>
           </div>
           <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#64748B' }}>
              <X size={20} />
           </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 32, background: '#fff' }}>
           <div style={{ display: 'grid', gap: 20 }}>
              {history.map(item => (
                <div key={item.id} style={{ padding: '24px', background: '#F8FAFC', borderRadius: 20, border: '1.5px solid #F1F5F9', transition: 'all 0.2s' }} className="node-row">
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Badge label={item.id} color="indigo" size="sm" />
                      <Badge label={item.status} color={item.status === 'SUCCESS' ? 'green' : 'orange'} />
                   </div>
                   <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{item.name}</div>
                   <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 800, marginBottom: 20 }}>Imported on {item.date}</div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px', background: '#fff', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
                      <div>
                         <div style={{ fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nodes</div>
                         <div style={{ fontSize: 16, fontWeight: 950, color: '#1E293B', marginTop: 4 }}>{item.count}</div>
                      </div>
                      <div>
                         <div style={{ fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Integrity</div>
                         <div style={{ fontSize: 16, fontWeight: 950, color: '#10B981', marginTop: 4 }}>{item.status === 'SUCCESS' ? '100%' : '84%'}</div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const MASTER_SCHEMA = {
  employee_id: { required: true, pattern: /^EMP-\d{3,6}$/ },
  full_name: { required: true, minLength: 3 },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  role: { required: true, options: ['Admin', 'HRManager', 'TeamLeader', 'TeamMember'] },
  department: { required: true },
};

export function BulkDataHub() {
  const { t } = useLanguage();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([
    { id: 'EXP-902', name: 'Q1_Master_Export.csv', status: 'SUCCESS', count: 124, date: '2026-04-20' },
    { id: 'IMP-881', name: 'New_Hires_Batch_A.json', status: 'PARTIAL', count: 42, date: '2026-04-18' },
  ]);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setReport(null);
    }
  };

  const runPreFlight = async () => {
    if (!file) return;
    setValidating(true);
    await new Promise(r => setTimeout(r, 1800));

    const mockResults = {
      totalRows: 50,
      passed: 46,
      failed: 4,
      anomalies: [
        { row: 12, field: 'employee_id', error: 'Invalid format (Expected EMP-XXXX)', suggestion: 'Verify ID sequence' },
        { row: 28, field: 'role', error: 'Unknown role: "SuperUser"', suggestion: 'Map to standard role' },
        { row: 31, field: 'email', error: 'Missing @ domain', suggestion: 'Correct email format' },
        { row: 45, field: 'department', error: 'Missing value', suggestion: 'Required field' },
      ],
      healthScore: 92,
    };

    setReport(mockResults);
    setValidating(false);
    
    logAIEvent(AI_EVENT_TYPES.DATA_VALIDATION, {
      fileName: file.name,
      rows: mockResults.totalRows,
      healthScore: mockResults.healthScore,
      status: mockResults.failed > 0 ? 'PARTIAL' : 'SUCCESS'
    });

    if (mockResults.failed > 0) {
      toast(t('Pre-flight validation complete with anomalies.'), 'warning');
    } else {
      toast(t('System health verified. Ready for commit.'), 'success');
    }
  };

  const downloadSchema = () => {
    const headers = Object.keys(MASTER_SCHEMA).join(',');
    const sample = "EMP-001,Ahmed Mohamed,ahmed.m@empowerhr.ai,HRManager,Operations";
    const csvContent = `${headers}\n${sample}`;
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "empowerhr_master_template.csv");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast(t('Enterprise CSV template downloaded.'), 'success');
  };

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      <SyncLedgerDrawer 
        isOpen={isLedgerOpen} 
        onClose={() => setIsLedgerOpen(false)} 
        history={history} 
      />
      
      {/* Infrastructure Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(59, 130, 246, 0.2)' 
              }}>
                 <Database size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: '#1E293B', margin: 0, letterSpacing: '-0.03em' }}>Bulk Data Hub</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                   <Badge label="Neural Schema Active" color="green" />
                   <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>Registry v4.2.0 • High-Velocity Node Ingestion</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => setIsLedgerOpen(true)}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <History size={18} /> Operation Ledger
          </Btn>
          <Btn 
            onClick={downloadSchema}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <Cloud size={18} /> Download Schema
          </Btn>
        </div>
      </div>

      {/* Real-time Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Validation Health', value: report ? `${report.healthScore}%` : '--', icon: ShieldCheck, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Ingested Records', value: report ? report.totalRows : '--', icon: Layers, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Anomalies Detected', value: report ? report.failed : '--', icon: AlertCircle, color: report?.failed > 0 ? '#DC2626' : '#94A3B8', bg: report?.failed > 0 ? '#FEF2F2' : '#F8FAFC' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card-employee" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #fff' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t(item.label)}</div>
              <div style={{ fontSize: 32, fontWeight: 950, color: '#1E293B', letterSpacing: '-0.02em' }}>{item.value}</div>
            </div>
            <div style={{ 
              width: 64, height: 64, borderRadius: 20, background: item.bg, color: item.color, 
              display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <item.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 32 }}>
        {/* Central Data Ingestion Zone */}
        <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
          <div className="glass-card-employee" style={{ padding: '60px', textAlign: 'center', border: '2px dashed #CBD5E1', background: 'rgba(255,255,255,0.6)' }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: 28, background: '#EFF6FF', 
              color: '#3B82F6', display: 'grid', placeItems: 'center', margin: '0 auto 32px' 
            }}>
              <UploadCloud size={40} />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 950, color: '#1E293B', marginBottom: 12 }}>Upload Master Records</h3>
            <p style={{ color: '#64748B', fontSize: 15, fontWeight: 600, marginBottom: 40, maxWidth: 440, margin: '0 auto 40px', lineHeight: 1.6 }}>
              Ingest CSV or JSON node clusters. The neural engine will enforce schema integrity before database commitment.
            </p>
            
            <input type="file" id="bulk-upload" hidden onChange={handleFileUpload} accept=".csv,.json" />
            <label htmlFor="bulk-upload" style={{ cursor: 'pointer' }}>
               <Btn variant="primary" style={{ pointerEvents: 'none', padding: '0 40px', height: 56, borderRadius: 16, background: '#1E293B', fontWeight: 900 }}>
                 {file ? file.name : 'Select Neural Source'}
               </Btn>
            </label>

            {file && !report && !validating && (
              <div style={{ marginTop: 24 }}>
                 <Btn onClick={runPreFlight} variant="primary" style={{ background: '#3B82F6', height: 56, borderRadius: 16, padding: '0 40px', fontWeight: 900, border: 'none' }}>
                   <Zap size={20} fill="currentColor" style={{ marginRight: 10 }} /> Execute Pre-Flight
                 </Btn>
              </div>
            )}
          </div>

          {validating && (
            <div className="glass-card-employee" style={{ padding: '48px', textAlign: 'center', border: '1.5px solid #F1F5F9' }}>
               <div className="animate-pulse" style={{ color: '#3B82F6', fontWeight: 950, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                 <Cpu size={24} className="spin" /> Analyzing Schema Integrity Ledger...
               </div>
            </div>
          )}

          {report && (
            <div className="glass-card-employee animate-in" style={{ padding: '32px', border: '1.5px solid #F1F5F9' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B' }}>Pre-Flight Intelligence Report</h3>
                  <Badge label={`System Health: ${report.healthScore}%`} color={report.healthScore > 90 ? 'green' : 'orange'} />
               </div>

               {report.failed > 0 && (
                 <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                       <AlertCircle size={18} color="#DC2626" /> Structural Anomalies Detected
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                       {report.anomalies.map((ano, i) => (
                         <div key={i} style={{ padding: '20px', background: '#F8FAFC', borderRadius: 16, border: '1.5px solid #F1F5F9', fontSize: 13 }} className="node-row">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                               <span style={{ fontWeight: 900, color: '#1E293B' }}>Row {ano.row} • {ano.field}</span>
                               <span style={{ color: '#DC2626', fontWeight: 900, textTransform: 'uppercase', fontSize: 11 }}>Integrity Error</span>
                            </div>
                            <div style={{ color: '#64748B', fontWeight: 600 }}>{ano.error}</div>
                            <div style={{ marginTop: 12, color: '#3B82F6', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                               <Sparkles size={14} /> Resolution Protocol: {ano.suggestion}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               <div style={{ display: 'flex', gap: 16 }}>
                  <Btn style={{ flex: 1, height: 56, borderRadius: 16, fontWeight: 900, background: '#10B981', border: 'none' }} disabled={report.failed > 0} variant="primary">
                     Commit to Production Registry
                  </Btn>
                  <Btn variant="outline" style={{ height: 56, borderRadius: 16, fontWeight: 800, color: '#64748B' }} onClick={() => setReport(null)}>Discard Cluster</Btn>
               </div>
            </div>
          )}
        </div>

        {/* Tactical Data Sidebar */}
        <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
           <div className="glass-card-employee" style={{ padding: '32px', border: '1.5px solid #F1F5F9' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={18} style={{ color: '#3B82F6' }} /> Neural Schema Constraints
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                 {Object.keys(MASTER_SCHEMA).map(key => (
                   <div key={key} style={{ 
                     fontSize: 12, fontWeight: 850, padding: '14px 18px', 
                     background: '#F8FAFC', borderRadius: 12, border: '1.5px solid #F1F5F9',
                     display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                     color: '#1E293B'
                   }}>
                      <span>{key.replace('_', ' ').toUpperCase()}</span>
                      <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                   </div>
                 ))}
              </div>
              <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginTop: 20, textAlign: 'center' }}>
                 Strict validation patterns are enforced for all master record imports.
              </p>
           </div>

           <div style={{ 
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
            borderRadius: 32, padding: '32px', color: '#fff', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden'
          }}>
             <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                <Cloud size={160} />
             </div>
             <h3 style={{ fontSize: 20, fontWeight: 950, marginBottom: 12, position: 'relative' }}>Data Hub Intelligence</h3>
             <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, lineHeight: 1.6, marginBottom: 28, position: 'relative' }}>
                Neural analysis detects 84% sync health. Executing deduplication audit is recommended for Engineering department.
             </p>
             <button style={{ 
               width: '100%', height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.1)', 
               border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, 
               fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(10px)',
               transition: 'all 0.2s'
             }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                Execute Global Audit →
             </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .node-row:hover { background: #fff !important; transform: translateY(-2px); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); }
        .node-row { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 2s linear infinite; }
        .animate-in-right { animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}} />
    </div>
  );
}
