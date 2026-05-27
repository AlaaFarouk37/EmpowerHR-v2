import React from 'react';
import { Navigate } from 'react-router-dom';

// Auth pages
import EmployeeLogin  from "../pages/EmployeeLogin";
import CandidateLogin from "../pages/CandidateLogin";
import Unauthorized   from "../pages/Unauthorized";
import LandingPage    from "../pages/LandingPage";

// HR pages
import { HRDashboardPage  } from "../pages/hr/DashboardPage";
import { HRFormsPage      } from "../pages/hr/FormPage";
import { HRSubmissionPage } from "../pages/hr/SubmissionPage";
import { HRJobPostingsPage } from "../pages/hr/JobPostingsPage";
import { HRJobsPage } from "../pages/hr/JobsPage";
import { HRCVRankingPage  } from "../pages/hr/CVRankingPage";
import { HREmployeesPage  } from "../pages/hr/EmployeesPage";
import { HRAttendancePage } from "../pages/hr/AttendancePage";
import { HRPayrollPage } from "../pages/hr/PayrollPage";
import { HRTrainingPage } from "../pages/hr/TrainingPage";
import { HRReviewsPage } from "../pages/hr/ReviewsPage";
import { HRSuccessionPage } from "../pages/hr/SuccessionPage";
import { HROnboardingPage } from "../pages/hr/OnboardingPage";
import { HRShiftsPage } from "../pages/hr/ShiftsPage";
import { HRPoliciesPage } from "../pages/hr/PoliciesPage";
import { HRBenefitsPage } from "../pages/hr/BenefitsPage";
import { HRExpensesPage } from "../pages/hr/ExpensesPage";
import { HRDocumentsPage } from "../pages/hr/DocumentsPage";
import { HRPlanningPage } from "../pages/hr/PlanningPage";
import { HRTicketsPage } from "../pages/hr/TicketsPage";
import { HRApprovalCenterPage } from "../pages/hr/ApprovalCenterPage";
import { HROrgNeuralMapPage } from "../pages/hr/OrgNeuralMapPage";
import { AttritionPage } from "../pages/hr/AttritionPage";
import { BenchmarkingPage } from "../pages/hr/BenchmarkingPage";
import { TalentMatrixPage } from "../pages/hr/TalentMatrixPage";
import { HRProfilePage, HRRecognitionPage, HRTeamPage } from "../pages/hr/SharedWorkspacePages";

// Employee pages
import { EmployeeFeedbackPage } from "../pages/employee/FeedbackPage";
import { EmployeeProfilePage  } from "../pages/employee/EmployeeProfilePage";
import { EmployeeDashboardPage } from "../pages/employee/DashboardPage";
import { EmployeeAttendancePage } from "../pages/employee/AttendancePage";
import { EmployeePayrollPage } from "../pages/employee/PayrollPage";
import { EmployeeLeaveManagementPage } from "../pages/employee/LeaveManagementPage";
import { WorkloadCalendarPage } from "../pages/employee/WorkloadCalendarPage";
import { EmployeeReviewsPage } from "../pages/employee/ReviewsPage";
import { EmployeeCareerPathPage } from "../pages/employee/CareerPathPage";
import { EmployeeOnboardingPage } from "../pages/employee/OnboardingPage";
import { EmployeeShiftsPage } from "../pages/employee/ShiftsPage";
import { EmployeeGoalsPage } from "../pages/employee/GoalsPage";
import { EmployeeTasksPage } from "../pages/employee/TasksPage";
import { EmployeeTrainingPage } from "../pages/employee/TrainingPage";
import { EmployeePoliciesPage } from "../pages/employee/PoliciesPage";
import { EmployeeRecognitionPage } from "../pages/employee/RecognitionPage";
import { EmployeeBenefitsPage } from "../pages/employee/BenefitsPage";
import { EmployeeExpensesPage } from "../pages/employee/ExpensesPage";
import { EmployeeDocumentsPage } from "../pages/employee/DocumentsPage";
import { EmployeeTicketsPage } from "../pages/employee/TicketsPage";
import { EmployeeSheetPage } from "../pages/employee/EmployeeSheetPage";

// Leader pages
import { TeamRecognitionPage } from "../pages/leader/RecognitionPage";
import { TeamCalendarPage } from "../pages/leader/TeamCalendarPage";
import { TeamRequestsPage } from "../pages/leader/TeamRequestsPage";
import { TeamAnalyticsPage } from "../pages/leader/TeamAnalyticsPage";
import { TeamSupportPage } from "../pages/leader/TeamSupportPage";
import { TeamFeedbackPage } from "../pages/leader/TeamFeedbackPage";
import { TeamDirectoryPage } from "../pages/leader/TeamDirectoryPage";
import { LeaderDashboardPage } from "../pages/leader/DashboardPage";
import { TeamGoalsPage } from "../pages/leader/TeamPage";
import { 
  LeaderAttendancePage, LeaderBenefitsPage, LeaderCareerPathPage, LeaderDocumentsPage, 
  LeaderExpensesPage, LeaderFeedbackPage, LeaderGoalsPage, LeaderMyRecognitionPage, 
  LeaderOnboardingPage, LeaderPayrollPage, LeaderProfilePage, LeaderReviewsPage, 
  LeaderShiftsPage, LeaderTasksPage, LeaderTicketsPage, LeaderTrainingPage, LeaderPoliciesPage 
} from "../pages/leader/WorkspacePages";
import {
  LeaderPersonalProfilePage,
  LeaderPersonalAttendancePage,
  LeaderPersonalPayrollPage,
  LeaderPersonalVaultPage,
  LeaderPersonalTicketsPage
} from "../pages/leader/PersonalCommandPages";

// Admin pages
import { AdminDashboardPage } from "../pages/admin/DashboardPage";
import { 
  AdminApprovalsPage, AdminAttendancePage, AdminBenefitsPage, AdminCVRankingPage, 
  AdminDocumentsPage, AdminEmployeesPage, AdminExpensesPage, AdminFormsPage, 
  AdminJobsPage, AdminOnboardingPage, AdminPayrollPage, AdminPoliciesPage, 
  AdminProfilePage, AdminRecognitionPage, AdminReviewsPage, AdminShiftsPage, 
  AdminSubmissionsPage, AdminSuccessionPage, AdminTeamPage, AdminTicketsPage, 
  AdminTrainingPage, AdminUsersPage 
} from "../pages/admin/OperationsPages";
import { OrganizationConfigPage } from "../pages/admin/OrganizationConfigPage";
import { ActivityLogsPage } from "../pages/admin/ActivityLogsPage";
import { AdminAnalyticsPage } from "../pages/admin/AdminAnalyticsPage";
import { BroadcastCenterPage } from "../pages/admin/BroadcastCenterPage";
import { PermissionsMatrixPage } from "../pages/admin/PermissionsMatrixPage";
import { AIIntelligencePage } from "../pages/admin/AIIntelligencePage";
import { BulkDataHub } from "../pages/admin/BulkDataHub";
import { SystemHealthPage } from "../pages/admin/SystemHealthPage";

// Candidate pages
import { EmployeeCareersPage } from "../pages/candidate/CareersPage";
import { CandidateApplicationsPage, CandidateDashboardPage } from "../pages/candidate/WorkspacePage";

export const PUBLIC_ROUTES = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <EmployeeLogin /> },
  { path: "/candidate/login", element: <CandidateLogin /> },
  { path: "/careers", element: <EmployeeCareersPage /> },
  { path: "/unauthorized", element: <Unauthorized /> },
];

export const PROTECTED_ROUTES = [
  // Candidate
  { path: "/candidate/dashboard", element: <CandidateDashboardPage />, roles: ["Candidate"], permission: "candidate.workspace.access" },
  { path: "/candidate/applications", element: <CandidateApplicationsPage />, roles: ["Candidate"], permission: "candidate.workspace.access" },

  // Team Member
  { path: "/employee/dashboard", element: <EmployeeDashboardPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/calendar", element: <WorkloadCalendarPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/attendance", element: <EmployeeAttendancePage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/leave-requests", element: <EmployeeLeaveManagementPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/payroll", element: <EmployeePayrollPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/reviews", element: <EmployeeReviewsPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/career-path", element: <EmployeeCareerPathPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/onboarding", element: <EmployeeOnboardingPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/shifts", element: <EmployeeShiftsPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/goals", element: <EmployeeGoalsPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/tasks", element: <EmployeeTasksPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/training", element: <EmployeeTrainingPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/policies", element: <EmployeePoliciesPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/recognition", element: <EmployeeRecognitionPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/benefits", element: <EmployeeBenefitsPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/expenses", element: <EmployeeExpensesPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/documents", element: <EmployeeDocumentsPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/tickets", element: <EmployeeTicketsPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/feedback", element: <EmployeeFeedbackPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/sheet", element: <EmployeeSheetPage />, roles: ["TeamMember"], permission: "employee.workspace.access" },
  { path: "/employee/profile", element: <EmployeeProfilePage />, roles: ["TeamMember", "HRManager", "Admin"], permission: "employee.workspace.access" },

  // Team Leader personal workspace
  { path: "/leader/dashboard", element: <LeaderDashboardPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/attendance", element: <LeaderPersonalAttendancePage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/payroll", element: <LeaderPersonalPayrollPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/reviews", element: <LeaderReviewsPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/career-path", element: <LeaderCareerPathPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/onboarding", element: <LeaderOnboardingPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/shifts", element: <LeaderShiftsPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/goals", element: <LeaderGoalsPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/tasks", element: <LeaderTasksPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/training", element: <LeaderTrainingPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/policies", element: <LeaderPoliciesPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/my-recognition", element: <LeaderMyRecognitionPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/benefits", element: <LeaderBenefitsPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/expenses", element: <LeaderExpensesPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/documents", element: <LeaderPersonalVaultPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/tickets", element: <LeaderPersonalTicketsPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/feedback", element: <LeaderFeedbackPage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },
  { path: "/leader/profile", element: <LeaderPersonalProfilePage />, roles: ["TeamLeader"], permission: "employee.workspace.access" },

  // Team Leader workspace
  { path: "/leader/team-calendar", element: <TeamCalendarPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/team-requests", element: <TeamRequestsPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/team-analytics", element: <TeamAnalyticsPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/team-support", element: <TeamSupportPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/team-feedback", element: <TeamFeedbackPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/team-directory", element: <TeamDirectoryPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/team", element: <TeamGoalsPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },
  { path: "/leader/recognition", element: <TeamRecognitionPage />, roles: ["TeamLeader"], permission: "leader.workspace.access" },

  // HR Manager
  { path: "/hr/dashboard", element: <HRDashboardPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/approvals", element: <HRApprovalCenterPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/org-map", element: <HROrgNeuralMapPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/employees", element: <HREmployeesPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/attrition", element: <AttritionPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/benchmarking", element: <BenchmarkingPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/talent-matrix", element: <TalentMatrixPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/attendance", element: <HRAttendancePage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/payroll", element: <HRPayrollPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/reviews", element: <HRReviewsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/succession", element: <HRSuccessionPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/onboarding", element: <HROnboardingPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/shifts", element: <HRShiftsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/policies", element: <HRPoliciesPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/benefits", element: <HRBenefitsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/expenses", element: <HRExpensesPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/documents", element: <HRDocumentsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/planning", element: <HRPlanningPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/tickets", element: <HRTicketsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/training", element: <HRTrainingPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/forms", element: <HRFormsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/submissions", element: <HRSubmissionPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/jobs", element: <HRJobPostingsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/jobs-alt", element: <HRJobsPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/cv-ranking", element: <HRCVRankingPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/team", element: <HRTeamPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/recognition", element: <HRRecognitionPage />, roles: ["HRManager"], permission: "hr.workspace.access" },
  { path: "/hr/profile", element: <HRProfilePage />, roles: ["HRManager"], permission: "hr.workspace.access" },

  // Admin
  { path: "/admin/dashboard", element: <AdminDashboardPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/intelligence", element: <AIIntelligencePage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/users", element: <AdminUsersPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/employees", element: <AdminEmployeesPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/approvals", element: <AdminApprovalsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/attendance", element: <AdminAttendancePage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/payroll", element: <AdminPayrollPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/reviews", element: <AdminReviewsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/succession", element: <AdminSuccessionPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/onboarding", element: <AdminOnboardingPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/shifts", element: <AdminShiftsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/policies", element: <AdminPoliciesPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/benefits", element: <AdminBenefitsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/expenses", element: <AdminExpensesPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/documents", element: <AdminDocumentsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/tickets", element: <AdminTicketsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/training", element: <AdminTrainingPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/forms", element: <AdminFormsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/submissions", element: <AdminSubmissionsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/jobs", element: <AdminJobsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/cv-ranking", element: <AdminCVRankingPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/team", element: <AdminTeamPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/recognition", element: <AdminRecognitionPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/profile", element: <AdminProfilePage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/data-hub", element: <BulkDataHub />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/organization", element: <OrganizationConfigPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/activity-logs", element: <ActivityLogsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/analytics", element: <AdminAnalyticsPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/broadcast", element: <BroadcastCenterPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/permissions", element: <PermissionsMatrixPage />, roles: ["Admin"], permission: "admin.workspace.access" },
  { path: "/admin/system-health", element: <SystemHealthPage />, roles: ["Admin"], permission: "admin.workspace.access" },
];
