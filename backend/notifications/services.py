"""Helpers for creating notifications from anywhere in the backend.

Import these in views and call after the relevant state change, e.g.:

    from notifications.services import notify_employee
    notify_employee(claim.employee, "Expense approved", "...", category="approval", level="success", section="expenses")

Every helper is defensive: a notification failure must never break the
originating request, so errors are logged and swallowed.
"""
import logging

from django.core.exceptions import ObjectDoesNotExist

from accounts.models import User

from .models import Notification

logger = logging.getLogger(__name__)

# Role-aware deep links so a notification opens the right page for its recipient.
# A given "section" resolves to a different route depending on the user's role.
WORKSPACE_LINKS = {
    'TeamMember': {
        'expenses': '/employee/expenses',
        'leave': '/employee/leave-requests',
        'attendance': '/employee/attendance',
        'tasks': '/employee/tasks',
        'feedback': '/employee/feedback',
    },
    'TeamLeader': {
        'expenses': '/leader/expenses',
        'leave': '/leader/my-leave-requests',
        'attendance': '/leader/attendance',
        'tasks': '/leader/tasks',
        'feedback': '/leader/feedback',
        'review_leave': '/leader/leave-requests',
        'review_corrections': '/leader/attendance-corrections',
    },
    'HRManager': {
        'expenses': '/hr/expenses',
        'leave': '/hr/leave-management',
        'review_leave': '/hr/leave-management',
        'review_corrections': '/hr/approvals',
        'approvals': '/hr/approvals',
    },
}


def link_for(user, section):
    if not section:
        return ''
    role = getattr(user, 'role', None)
    return WORKSPACE_LINKS.get(role, {}).get(section, '')


def _employee_user(employee):
    """The User account linked to an Employee, or None."""
    if employee is None:
        return None
    try:
        return employee.user_account
    except ObjectDoesNotExist:
        return None


def _team_leader_user(employee):
    """The User account of the leader of this employee's team, or None."""
    team = getattr(employee, 'team', None)
    leader = getattr(team, 'leader', None) if team else None
    return _employee_user(leader) if leader else None


def notify(recipient, title, message='', *, category=Notification.Category.GENERAL,
           level=Notification.Level.INFO, section='', link=''):
    """Create one notification for a User. Returns the row, or None on failure."""
    if recipient is None:
        return None
    try:
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message or '',
            category=category,
            level=level,
            link=link or link_for(recipient, section),
        )
    except Exception:
        logger.exception("Failed to create notification for recipient %s", getattr(recipient, 'pk', None))
        return None


def notify_users(users, title, message='', **kwargs):
    return [n for n in (notify(u, title, message, **kwargs) for u in users if u) if n]


def notify_roles(roles, title, message='', *, exclude_user=None, **kwargs):
    """Notify every active user holding one of the given roles."""
    qs = User.objects.filter(role__in=roles, is_active=True)
    if exclude_user is not None:
        qs = qs.exclude(pk=getattr(exclude_user, 'pk', exclude_user))
    return notify_users(qs, title, message, **kwargs)


def notify_employee(employee, title, message='', **kwargs):
    """Notify the User behind an Employee record."""
    return notify(_employee_user(employee), title, message, **kwargs)


def notify_team_leader_or_hr(employee, title, message='', **kwargs):
    """Notify the employee's team leader; fall back to HR managers if there is none."""
    leader_user = _team_leader_user(employee)
    if leader_user:
        return [notify(leader_user, title, message, **kwargs)]
    return notify_roles(['HRManager'], title, message, **kwargs)
