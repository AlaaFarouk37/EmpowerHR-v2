import { LeaderPortalLayout } from '../../components/shared/index.jsx';
import { HRTeamHubPage } from '../hr/TeamHubPage';

/**
 * Leader's Team Hub — same layout, stats, per-member utilization cards, calendar,
 * goal/task tables, and creation modals as the HR Team Hub, minus the team filter
 * (a Team Leader only sees their own team — backend already scopes the data).
 */
export function LeaderTeamHubPage() {
  return (
    <LeaderPortalLayout>
      <HRTeamHubPage showTeamFilter={false} />
    </LeaderPortalLayout>
  );
}
