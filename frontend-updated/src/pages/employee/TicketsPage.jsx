import { PersonalTicketsPage } from '../shared/PersonalTicketsPage.jsx';

// Employee, Team Leader and HR Manager all share the same personal support-ticket
// workspace (create / pending / 6-month history). See PersonalTicketsPage.
export function EmployeeTicketsPage() {
  return <PersonalTicketsPage />;
}
