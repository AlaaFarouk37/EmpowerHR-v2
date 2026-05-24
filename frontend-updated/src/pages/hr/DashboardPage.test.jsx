import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HRDashboardPage } from './DashboardPage';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../../api/index.js', () => ({
  hrGetInsights: jest.fn(),
  hrGetIntelligence: jest.fn(),
  hrGetRecognitionWatch: jest.fn(),
  getPredictions: jest.fn(),
  hrGetActionPlans: jest.fn(),
  hrGetApprovalSnapshot: jest.fn(),
  hrGetAttendanceWatch: jest.fn(),
  hrGetPayrollWatch: jest.fn(),
  hrGetBenefitWatch: jest.fn(),
  hrGetExpenseWatch: jest.fn(),
  hrGetDocumentWatch: jest.fn(),
  hrGetTicketWatch: jest.fn(),
  hrGetTrainingCompliance: jest.fn(),
  hrGetSuccessionWatch: jest.fn(),
  hrGetOnboardingWatch: jest.fn(),
  hrGetJobPipelineHealth: jest.fn(),
  hrGetPolicyCompliance: jest.fn(),
  runPrediction: jest.fn(),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (x) => x, language: 'en' }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ resolvePath: (x) => x }),
}));

jest.mock('../../components/shared/index.jsx', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Btn: ({ children, onClick, disabled }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Badge: ({ label }) => <span>{label}</span>,
  useToast: () => jest.fn(),
  PageHeader: ({ title }) => <h1>{title}</h1>,
  Skeleton: () => <div data-testid="skeleton">Skeleton</div>,
}));

const api = require('../../api/index.js');

describe('HRDashboardPage', () => {
  beforeEach(() => {
    api.hrGetInsights.mockResolvedValue({ totals: { totalEmployees: 150 }, attendanceSummary: { completionRate: 95 } });
    api.hrGetIntelligence.mockResolvedValue({ overview: {}, trends: { riskPressurePct: 15 }, priorityQueue: [] });
    api.hrGetRecognitionWatch.mockResolvedValue({ summary: {}, categoryBreakdown: [], followUpItems: [] });
    api.getPredictions.mockResolvedValue([]);
    api.hrGetActionPlans.mockResolvedValue([]);
    api.hrGetApprovalSnapshot.mockResolvedValue({ summary: { pendingCount: 5 }, followUpItems: [] });
    api.hrGetAttendanceWatch.mockResolvedValue({ summary: { followUpCount: 2 }, followUpItems: [] });
    api.hrGetPayrollWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetBenefitWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetExpenseWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetDocumentWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetTicketWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetTrainingCompliance.mockResolvedValue({ summary: { atRiskAssignments: 0 }, followUpItems: [] });
    api.hrGetSuccessionWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetOnboardingWatch.mockResolvedValue({ summary: { followUpCount: 0 }, followUpItems: [] });
    api.hrGetJobPipelineHealth.mockResolvedValue({ totals: { staleCandidates: 0 }, followUpItems: [] });
    api.hrGetPolicyCompliance.mockResolvedValue({ summary: { pendingAcknowledgements: 0 }, followUpItems: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton loading state initially', () => {
    render(
      <BrowserRouter>
        <HRDashboardPage />
      </BrowserRouter>
    );
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders dashboard content after loading', async () => {
    render(
      <BrowserRouter>
        <HRDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Executive Command Center')).toBeInTheDocument();
    });

    expect(screen.getByText('Continuity')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument(); // Attendance rate
  });

  it('triggers AI scan on button click', async () => {
    api.runPrediction.mockResolvedValue({ predictions: [], totalProcessed: 150 });
    
    render(
      <BrowserRouter>
        <HRDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Executive Command Center')).toBeInTheDocument();
    });

    const scanBtn = screen.getByText('Run AI Scan');
    fireEvent.click(scanBtn);

    expect(api.runPrediction).toHaveBeenCalled();
  });

  it('shows operational ledger with correct data', async () => {
    api.hrGetApprovalSnapshot.mockResolvedValue({ 
      summary: { pendingCount: 5 }, 
      followUpItems: [
        { employeeName: 'John Doe', followUpState: 'Pending Approval', department: 'Sales' }
      ] 
    });

    render(
      <BrowserRouter>
        <HRDashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Global Operational Ledger')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
