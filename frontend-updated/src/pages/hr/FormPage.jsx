import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  hrGetForms,
  hrGetFormDetail,
  hrCreateForm,
  hrUpdateForm,
  hrDeleteForm,
  hrActivateForm,
  hrDeactivateForm,
  hrAddQuestion,
  hrDeleteQuestion,
} from '../../api/index.js';
import { Spinner, Badge, Btn, useToast, Input, Modal, Textarea } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Plus,
  MessageSquare,
  Zap,
  Sparkles,
  SearchCode,
  MoreVertical,
  ClipboardList,
  Trash2,
  Pencil,
  Power
} from 'lucide-react';

export function HRFormsPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { resolvePath } = useAuth();
  
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedForm, setSelectedForm] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddQ, setShowAddQ] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [editData, setEditData] = useState({ title: '', description: '' });
  const [qData, setQData] = useState({ questionText: '', fieldType: 'score_1_4', order: 0 });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const FIELD_TYPES = ['score_1_4', 'decimal', 'boolean'];
  const FIELD_LABELS = { score_1_4: 'Score 1-4', boolean: 'Yes / No', decimal: 'Decimal' };

  const load = async () => {
    setLoading(true);
    try {
      const data = await hrGetForms();
      setForms(Array.isArray(data) ? data : []);
    } catch { toast('Failed to load feedback forms', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openForm = async (form) => {
    setSelectedForm(form);
    try {
      const detail = await hrGetFormDetail(form.formID);
      if (detail?.formID) setSelectedForm(detail);
    } catch {
      // fall back to the list payload
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) { toast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await hrCreateForm(formData);
      if (res?.formID) {
        toast('Form created');
        setShowCreate(false);
        setFormData({ title: '', description: '' });
        await load();
      } else {
        toast('Failed to create form', 'error');
      }
    } catch (err) {
      toast(err?.message || 'Failed to create form', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedForm?.formID) { toast('Select a form first', 'error'); return; }
    if (!qData.questionText.trim()) { toast('Question text is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await hrAddQuestion(selectedForm.formID, qData);
      if (res?.questionID) {
        toast('Question added');
        setShowAddQ(false);
        setQData({ questionText: '', fieldType: 'score_1_4', order: 0 });
        const detail = await hrGetFormDetail(selectedForm.formID);
        if (detail?.formID) setSelectedForm(detail);
        await load();
      } else {
        toast('Failed to add question', 'error');
      }
    } catch (err) {
      toast(err?.message || 'Failed to add question', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!selectedForm?.formID) return;
    if (!window.confirm('Delete this question?')) return;
    try {
      await hrDeleteQuestion(q.questionID);
      toast('Question deleted');
      const detail = await hrGetFormDetail(selectedForm.formID);
      if (detail?.formID) setSelectedForm(detail);
      await load();
    } catch (err) {
      toast(err?.message || 'Failed to delete question', 'error');
    }
  };

  const openEdit = () => {
    if (!selectedForm) return;
    setEditData({
      title: selectedForm.title || '',
      description: selectedForm.description || '',
    });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!selectedForm?.formID) { toast('Select a form first', 'error'); return; }
    if (!editData.title.trim()) { toast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await hrUpdateForm(selectedForm.formID, editData);
      if (res?.formID) {
        toast('Form updated');
        setShowEdit(false);
        const detail = await hrGetFormDetail(selectedForm.formID).catch(() => res);
        setSelectedForm(detail?.formID ? detail : res);
        await load();
      } else {
        toast('Failed to update form', 'error');
      }
    } catch (err) {
      toast(err?.message || 'Failed to update form', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedForm?.formID || toggling) return;
    setToggling(true);
    try {
      if (selectedForm.isActive) {
        await hrDeactivateForm(selectedForm.formID);
        toast(`"${selectedForm.title}" deactivated`);
      } else {
        await hrActivateForm(selectedForm.formID);
        toast(`"${selectedForm.title}" is now active`);
      }
      const detail = await hrGetFormDetail(selectedForm.formID).catch(() => null);
      if (detail?.formID) setSelectedForm(detail);
      await load();
    } catch (err) {
      toast(err?.message || 'Failed to update form status', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!selectedForm?.formID) return;
    if (!window.confirm(`Delete "${selectedForm.title}"? This cannot be undone.`)) return;
    try {
      await hrDeleteForm(selectedForm.formID);
      toast('Form deleted');
      setSelectedForm(null);
      await load();
    } catch (err) {
      toast(err?.message || 'Failed to delete form', 'error');
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING FEEDBACK GRID...</div>
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
                 <ClipboardList size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Organizational Feedback Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Deploy workforce intelligence surveys, monitor network sentiment, and audit form payloads.</p>
        </div>

        <Btn
          onClick={() => { setFormData({ title: '', description: '' }); setShowCreate(true); }}
          variant="primary"
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Deploy Intelligence Form')}
        </Btn>
      </div>

      {/* Split layout: forms list (left) + selected form's questions (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 480px', gap: 24, alignItems: 'flex-start' }}>
        {/* Left pane: Neural Feedback Ledger */}
        <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
                {['Intelligence Node', 'Data Payload', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '20px 24px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forms.map((form, idx) => {
                const isActive = form.isActive;
                const isSelected = selectedForm?.formID === form.formID;

                return (
                  <tr
                    key={idx}
                    onClick={() => openForm(form)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background 0.2s',
                      background: isSelected ? 'var(--red-50)' : isActive ? 'rgba(220, 38, 38, 0.01)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--red-600)' : '4px solid transparent',
                      cursor: 'pointer',
                    }}
                    className="form-row"
                  >
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, background: isSelected || isActive ? 'var(--red-50)' : '#F8FAFC',
                          display: 'grid', placeItems: 'center', color: isSelected || isActive ? 'var(--red-600)' : '#94A3B8', border: `1px solid ${isSelected || isActive ? 'var(--red-100)' : '#F1F5F9'}`
                        }}>
                          <MessageSquare size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{form.title}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>FRM-00{form.formID}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--red-600)' }}>
                        {form.submissionCount || 0}
                      </div>
                      <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Submissions</div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <Badge
                        label={isActive ? 'LIVE NODE' : 'DRAFT'}
                        color={isActive ? 'green' : 'gray'}
                      />
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="action-btn" title="Open Questions" onClick={(e) => { e.stopPropagation(); openForm(form); }}><SearchCode size={18} /></button>
                        <button className="action-btn" title="Add Question" onClick={(e) => { e.stopPropagation(); openForm(form).then(() => setShowAddQ(true)); }}><Plus size={18} /></button>
                        <button className="action-btn" title="Tactical Options"><MoreVertical size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right pane: questions for the selected form */}
        <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', overflow: 'hidden', position: 'sticky', top: 24 }}>
          {!selectedForm ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F8FAFC', color: '#94A3B8', display: 'grid', placeItems: 'center', margin: '0 auto 16px', border: '1px solid #F1F5F9' }}>
                <ClipboardList size={28} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', marginBottom: 6 }}>{t('Select a form to view its questions')}</div>
              <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{t('Click any Intelligence Node on the left to manage its questions.')}</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '24px 28px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>FRM-00{selectedForm.formID}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedForm.title}</div>
                  {selectedForm.description && (
                    <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 4 }}>{selectedForm.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <Badge label={selectedForm.isActive ? t('Live') : t('Draft')} color={selectedForm.isActive ? 'green' : 'gray'} />
                    <Badge label={`${selectedForm.questions?.length || selectedForm.questionCount || 0} ${t('questions')}`} color="indigo" />
                    <Badge label={`${selectedForm.submissionCount || 0} ${t('submissions')}`} color="gray" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    onClick={openEdit}
                    title={t('Edit form')}
                    className="form-icon-btn"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={handleToggleActive}
                    disabled={toggling}
                    title={selectedForm.isActive ? t('Deactivate form') : t('Activate form')}
                    className={`form-icon-btn ${selectedForm.isActive ? 'is-active' : ''}`}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={handleDeleteForm}
                    title={t('Delete form')}
                    className="form-icon-btn is-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                  <Btn onClick={() => setShowAddQ(true)} style={{ borderRadius: 12, fontWeight: 800, padding: '10px 18px', minWidth: 160 }}>
                    <Plus size={16} style={{ marginRight: 6 }} /> {t('Add Question')}
                  </Btn>
                </div>
              </div>
              <div style={{ padding: '20px 28px 28px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {(!selectedForm.questions || selectedForm.questions.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <Sparkles size={32} color="#94A3B8" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{t('No questions yet')}</div>
                    <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{t('Add your first question to start collecting answers.')}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedForm.questions.map((q, i) => (
                      <div key={q.questionID} style={{ position: 'relative', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 14, padding: '14px 44px 14px 16px' }}>
                        <button
                          onClick={() => handleDeleteQuestion(q)}
                          title={t('Delete question')}
                          style={{
                            position: 'absolute', top: 10, right: 10,
                            width: 28, height: 28, padding: 0, border: 'none',
                            background: 'transparent', color: '#94A3B8',
                            borderRadius: 8, display: 'grid', placeItems: 'center',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red-600)'; e.currentTarget.style.background = 'var(--red-50)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Trash2 size={16} />
                        </button>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--red-600)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                          {FIELD_LABELS[q.fieldType] || q.fieldType}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{i + 1}. {q.questionText}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .form-row:hover { background: #FBFBFF; }
        .action-btn {
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff;
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center;
          cursor: pointer; transition: all 0.2s;
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        .form-icon-btn {
          width: 36px; height: 36px; padding: 0; border: 1.5px solid #F1F5F9;
          background: #fff; color: #94A3B8; border-radius: 10px;
          display: grid; place-items: center; cursor: pointer; transition: all 0.2s;
        }
        .form-icon-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        .form-icon-btn.is-active { color: #16A34A; border-color: #BBF7D0; background: #F0FDF4; }
        .form-icon-btn.is-active:hover { color: #B45309; border-color: #FDE68A; background: #FFFBEB; }
        .form-icon-btn.is-danger:hover { color: #B91C1C; border-color: #FCA5A5; background: #FEE2E2; }
        .form-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />

      {/* Create form modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('Deploy Intelligence Form')}>
        <Input
          label={t('Form Title')}
          value={formData.title}
          onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Q1 2026 Employee Satisfaction"
        />
        <Textarea
          label={t('Description (optional)')}
          value={formData.description}
          onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
          placeholder="Brief description of the form..."
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>{t('Cancel')}</Btn>
          <Btn onClick={handleCreate} disabled={saving} style={{ flex: 1 }}>{saving ? t('Creating...') : t('Create Form')}</Btn>
        </div>
      </Modal>

      {/* Add question modal */}
      <Modal open={showAddQ} onClose={() => setShowAddQ(false)} title={t('Add Question')}>
        <Textarea
          label={t('Question Text')}
          value={qData.questionText}
          onChange={(e) => setQData((d) => ({ ...d, questionText: e.target.value }))}
          placeholder="e.g. How would you rate your work-life balance?"
        />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>{t('Field Type')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {FIELD_TYPES.map((fieldType) => (
              <button
                key={fieldType}
                onClick={() => setQData((d) => ({ ...d, fieldType }))}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  border: '2px solid', cursor: 'pointer', transition: 'all .15s',
                  borderColor: qData.fieldType === fieldType ? 'var(--red-600)' : '#E2E8F0',
                  background: qData.fieldType === fieldType ? 'var(--red-50)' : '#fff',
                  color: qData.fieldType === fieldType ? 'var(--red-600)' : '#64748B',
                }}
              >
                {t(FIELD_LABELS[fieldType])}
              </button>
            ))}
          </div>
        </div>
        <Input
          label={t('Display Order')}
          type="number"
          value={qData.order}
          onChange={(e) => setQData((d) => ({ ...d, order: parseInt(e.target.value, 10) || 0 }))}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setShowAddQ(false)} style={{ flex: 1 }}>{t('Cancel')}</Btn>
          <Btn onClick={handleAddQuestion} disabled={saving} style={{ flex: 1 }}>{saving ? t('Adding...') : t('Add Question')}</Btn>
        </div>
      </Modal>

      {/* Edit form modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t('Edit Form')}>
        <Input
          label={t('Form Title')}
          value={editData.title}
          onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
        />
        <Textarea
          label={t('Description')}
          value={editData.description}
          onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setShowEdit(false)} style={{ flex: 1 }}>{t('Cancel')}</Btn>
          <Btn onClick={handleUpdate} disabled={saving} style={{ flex: 1 }}>{saving ? t('Saving...') : t('Save Changes')}</Btn>
        </div>
      </Modal>
    </div>
  );
}
