import { PersonalTicketsPage } from '../shared/PersonalTicketsPage.jsx';

// HR Managers use the same personal support-ticket workspace as employees and
// team leaders (create / pending / 6-month history). See PersonalTicketsPage.
export function HRTicketsPage() {
  return <PersonalTicketsPage />;
}
