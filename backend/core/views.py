import logging
import re

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SendEmailView(APIView):
    """POST /api/send-email/ — send a transactional email via Resend.

    Body: {"to": "...", "subject": "...", "body": "..."}
    Auth: any authenticated user (Team Lead or Team Member contacting each other
    about a task). No database logging.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to = (request.data.get("to") or "").strip()
        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()

        missing = [name for name, value in (("to", to), ("subject", subject), ("body", body)) if not value]
        if missing:
            return Response(
                {"error": f"Missing required field(s): {', '.join(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not EMAIL_RE.match(to):
            return Response(
                {"error": "Field 'to' must be a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "RESEND_API_KEY", "")
        sender = getattr(settings, "HR_FROM_EMAIL", "")
        if not api_key or not sender:
            logger.error("Resend is not configured: RESEND_API_KEY/HR_FROM_EMAIL missing.")
            return Response(
                {"error": "Email service is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            import resend
        except ImportError:
            logger.exception("resend package is not installed.")
            return Response(
                {"error": "Email service dependency is not installed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        resend.api_key = api_key
        reply_to = (getattr(request.user, "email", "") or "").strip()
        html_body = body.replace("\n", "<br>")

        payload = {
            "from": sender,
            "to": [to],
            "subject": subject,
            "html": html_body,
            "text": body,
        }
        if reply_to and EMAIL_RE.match(reply_to):
            payload["reply_to"] = [reply_to]

        try:
            result = resend.Emails.send(payload)
        except Exception:
            logger.exception("Resend API call failed.")
            return Response(
                {"error": "Failed to send email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        message_id = (result or {}).get("id") if isinstance(result, dict) else None
        return Response({"status": "sent", "id": message_id}, status=status.HTTP_200_OK)
