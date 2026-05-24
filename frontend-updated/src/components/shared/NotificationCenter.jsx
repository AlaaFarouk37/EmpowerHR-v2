import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Zap, Shield, Wallet, Activity, ExternalLink, X } from 'lucide-react';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../../api/notification';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/components/NotificationCenter.css';

const CATEGORY_ICONS = {
  ai: { icon: Zap, color: '#10B981', bg: '#ECFDF5' },
  approval: { icon: Shield, color: '#3B82F6', bg: '#EFF6FF' },
  payroll: { icon: Wallet, color: '#F59E0B', bg: '#FFFBEB' },
  system: { icon: Activity, color: '#6366F1', bg: '#EEF2FF' },
  general: { icon: Bell, color: '#94A3B8', bg: '#F8FAFC' }
};

const LEVEL_COLORS = {
  danger: { color: '#DC2626', bg: '#FEF2F2' },
  warning: { color: '#F59E0B', bg: '#FFFBEB' },
  success: { color: '#10B981', bg: '#ECFDF5' },
  info: { color: '#3B82F6', bg: '#EFF6FF' },
  general: { color: '#64748B', bg: '#F8FAFC' }
};

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useLanguage();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const [data, countData] = await Promise.all([getNotifications(), getUnreadCount()]);
      setNotifications(data);
      setUnreadCount(countData.count);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const n = notifications.find(x => x.id === id);
      if (n && !n.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) handleMarkRead(n.id);
    if (n.link) navigate(n.link);
    setIsOpen(false);
  };

  return (
    <div className="notification-center-root" ref={dropdownRef}>
      <button 
        className={`topbar-icon-btn ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title={t('Notifications')}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>{t('Notifications')}</h3>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-btn">
                  <Check size={14} /> {t('Mark all as read')}
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="close-btn"><X size={16} /></button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const config = CATEGORY_ICONS[n.category] || CATEGORY_ICONS.general;
                const colors = LEVEL_COLORS[n.level] || LEVEL_COLORS.general;
                const Icon = config.icon;
                return (
                  <div 
                    key={n.id} 
                    className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="notification-icon" style={{ background: colors.bg, color: colors.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        {n.title}
                        {!n.is_read && <span className="unread-pulse" />}
                      </div>
                      <p className="notification-msg">{n.message}</p>
                      <span className="notification-time">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="notification-actions">
                       {n.link && <ExternalLink size={12} className="link-icon" />}
                       <button onClick={(e) => handleDelete(e, n.id)} className="delete-btn">
                         <Trash2 size={12} />
                       </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="notification-empty">
                <div className="empty-icon">🌑</div>
                <p>{t('All quiet on the neural front.')}</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
               <button className="view-all-btn" onClick={() => { setIsOpen(false); navigate('/hr/notifications'); }}>
                 {t('System Activity Log')}
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
