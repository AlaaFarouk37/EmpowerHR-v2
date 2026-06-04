import { api, toList } from './base';

export const getNotifications = async () => toList(await api.get('/notifications/'));
export const getUnreadCount = () => api.get('/notifications/unread-count/');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/`, { is_read: true });
export const markAllNotificationsRead = () => api.post('/notifications/mark-all-read/', {});
export const deleteNotification = (id) => api.delete(`/notifications/${id}/`);

// Transactional email via Resend (backend: POST /api/send-email/).
// Note: this endpoint is mounted at /api/send-email/, not under /api/notifications/.
export const sendEmail = (data) => api.post('/send-email/', data);
