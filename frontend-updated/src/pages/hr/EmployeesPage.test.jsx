import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HREmployeesPage } from './EmployeesPage';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../../api/index.js', () => ({
  hrGetEmployees: jest.fn(),
  getLatestAttritionPredictions: jest.fn(),
  hrGetEmployeeSnapshot: jest.fn(),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (x) => x, language: 'en' }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ resolvePath: (x) => x }),
}));

jest.mock('../../components/shared/index.jsx', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Btn: ({ children, onClick, disabled, style }) => <button onClick={onClick} disabled={disabled} style={style}>{children}</button>,
  Badge: ({ label, color }) => <span style={{ color }}>{label}</span>,
  useToast: () => jest.fn(),
  PageHeader: ({ title }) => <h1>{title}</h1>,
  Skeleton: () => <div data-testid="skeleton">Skeleton</div>,
  NeuralNode: ({ employee }) => <div data-testid="neural-node">{employee.fullName}</div>,
  DatalistInput: () => <div>Datalist</div>,
  NeuralInput: () => <div>NeuralInput</div>,
  Input: () => <div>Input</div>,
  Modal: ({ children, isOpen }) => isOpen ? <div>{children}</div> : null,
}));

const api = require('../../api/index.js');

describe('HREmployeesPage', () => {
  beforeEach(() => {
    api.hrGetEmployees.mockResolvedValue([
      { employeeID: '1', fullName: 'Alice Smith', department: 'Engineering', jobTitle: 'Senior Dev' },
      { employeeID: '2', fullName: 'Bob Jones', department: 'HR', jobTitle: 'Lead Recruiter' },
    ]);
    api.getLatestAttritionPredictions.mockResolvedValue([
      { employeeID: '1', riskScore: 0.85, riskLevel: 'High', explanationSummary: 'Stale growth' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton loading state initially', () => {
    render(
      <BrowserRouter>
        <HREmployeesPage />
      </BrowserRouter>
    );
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renders employee dossiers after loading', async () => {
    render(
      <BrowserRouter>
        <HREmployeesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workforce Intelligence Ledger')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('highlights high-risk employees', async () => {
    render(
      <BrowserRouter>
        <HREmployeesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    // Risk indicator
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('filters employees by search query', async () => {
    render(
      <BrowserRouter>
        <HREmployeesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search node matrix/i);
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });
});
