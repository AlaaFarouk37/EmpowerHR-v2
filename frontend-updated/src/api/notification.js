import { api, toList } from './base';

export const getNotifications = async () => toList(await api.get('/notifications/'));
export const getUnreadCount = () => api.get('/notifications/unread-count/');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/`, { is_read: true });
export const markAllNotificationsRead = () => api.post('/notifications/mark-all-read/', {});
export const deleteNotification = (id) => api.delete(`/notifications/${id}/`);
