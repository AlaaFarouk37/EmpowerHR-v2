import { useEffect, useState } from 'react';
import { sendEmail } from '../../api/index.js';
import { Btn, Input, Modal, Textarea } from './index.jsx';

/**
 * Ported verbatim from frontend-old/src/components/shared/ContactEmailModal.jsx.
 * Sends a transactional email via the backend's Resend integration.
 */
export default function ContactEmailModal({ to = '', subject = '', onClose, onSent }) {
  const [toAddr, setToAddr] = useState(to);
  const [subj, setSubj] = useState(subject);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setToAddr(to); }, [to]);
  useEffect(() => { setSubj(subject); }, [subject]);

  const handleSend = async () => {
    setError('');
    if (!toAddr.trim() || !subj.trim() || !body.trim()) {
      setError('Please fill in To, Subject, and Body.');
      return;
    }
    setSending(true);
    try {
      await sendEmail({ to: toAddr.trim(), subject: subj.trim(), body });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Contact via email" maxWidth={560}>
      <div style={{ display: 'grid', gap: 4 }}>
        <Input
          label="To"
          type="email"
          value={toAddr}
          onChange={(e) => setToAddr(e.target.value)}
          placeholder="recipient@example.com"
          disabled={sending}
        />
        <Input
          label="Subject"
          value={subj}
          onChange={(e) => setSubj(e.target.value)}
          placeholder="Re: Task name"
          disabled={sending}
        />
        <Textarea
          label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message..."
          rows={8}
          disabled={sending}
        />
        {error ? (
          <div
            role="alert"
            style={{
              background: '#FEF2F2',
              color: '#B42318',
              border: '1px solid #FECACA',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
          <Btn variant="primary" onClick={handleSend} disabled={sending} style={{ flex: 1 }}>
            {sending ? 'Sending...' : 'Send'}
          </Btn>
          <Btn variant="ghost" onClick={onClose} disabled={sending} style={{ flex: 1 }}>
            Cancel
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
