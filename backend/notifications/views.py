from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """GET /api/notifications/ — the current user's most recent notifications."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)[:50]
        return Response(NotificationSerializer(qs, many=True).data)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — {"count": N}."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})


class NotificationMarkAllReadView(APIView):
    """POST /api/notifications/mark-all-read/ — mark all the user's notifications read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok', 'updated': updated})


class NotificationDetailView(APIView):
    """PATCH (mark read) / DELETE a single notification owned by the user."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notif = Notification.objects.filter(pk=pk, recipient=request.user).first()
        if not notif:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = bool(request.data.get('is_read', True))
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)

    def delete(self, request, pk):
        deleted, _ = Notification.objects.filter(pk=pk, recipient=request.user).delete()
        if not deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
