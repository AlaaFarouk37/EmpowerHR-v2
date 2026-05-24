import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HROrgNeuralMapPage } from './OrgNeuralMapPage';

// Mock dependencies
jest.mock('../../api/recruitment', () => ({
  hrGetTalentGraph: jest.fn(),
}));
jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (x) => x }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ resolvePath: (x) => x }),
}));

const { hrGetTalentGraph } = require('../../api/recruitment');

describe('HROrgNeuralMapPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<HROrgNeuralMapPage />);
    expect(screen.getByText('Syncing Neural Nodes...')).toBeInTheDocument();
  });

  it('renders error on invalid node data', async () => {
    hrGetTalentGraph.mockResolvedValueOnce({ nodes: [{ id: '', label: '' }], links: [] });
    render(<HROrgNeuralMapPage />);
    await waitFor(() => {
      expect(screen.getByText('Invalid node data received from backend.')).toBeInTheDocument();
    });
  });

  it('renders error on duplicate node IDs', async () => {
    hrGetTalentGraph.mockResolvedValueOnce({ nodes: [
      { id: '1', label: 'A' },
      { id: '1', label: 'B' },
    ], links: [] });
    render(<HROrgNeuralMapPage />);
    await waitFor(() => {
      expect(screen.getByText('Duplicate node IDs detected in neural map data.')).toBeInTheDocument();
    });
  });

  it('shows large graph warning if nodes > 500', async () => {
    hrGetTalentGraph.mockResolvedValueOnce({
      nodes: Array.from({ length: 501 }, (_, i) => ({ id: String(i), label: `Node${i}` })),
      links: [],
    });
    render(<HROrgNeuralMapPage />);
    await waitFor(() => {
      expect(screen.getByText(/large organization map/i)).toBeInTheDocument();
    });
  });

  it('renders graph if data is valid and small', async () => {
    hrGetTalentGraph.mockResolvedValueOnce({
      nodes: [
        { id: '1', label: 'A', role: 'Engineer', dept: 'Engineering', riskScore: 0.1 },
        { id: '2', label: 'B', role: 'Manager', dept: 'HR', riskScore: 0.2 },
      ],
      links: [{ source: '1', target: '2' }],
    });
    render(<HROrgNeuralMapPage />);
    await waitFor(() => {
      expect(screen.getByText('Organizational Pulse Visualizer')).toBeInTheDocument();
    });
  });
});
