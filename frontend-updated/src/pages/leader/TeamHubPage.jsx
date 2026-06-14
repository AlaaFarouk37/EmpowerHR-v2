import { LeaderPortalLayout } from '../../components/shared/index.jsx';
import { HRTeamHubPage } from '../hr/TeamHubPage';

export function LeaderTeamHubPage() {
  return (
    <LeaderPortalLayout>
      <HRTeamHubPage showTeamFilter={false} />
    </LeaderPortalLayout>
  );
}
