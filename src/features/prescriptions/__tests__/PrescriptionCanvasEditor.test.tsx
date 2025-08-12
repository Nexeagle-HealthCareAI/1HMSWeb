import { render, screen } from '@testing-library/react';
import { PrescriptionCanvasEditor } from '../index';

// Mock the dependencies
jest.mock('react-rnd', () => ({
  Rnd: ({ children }: { children: React.ReactNode }) => <div data-testid="rnd-component">{children}</div>,
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

// Mock fetch
global.fetch = jest.fn();

describe('PrescriptionCanvasEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders canvas and toolbar', () => {
    render(<PrescriptionCanvasEditor hospitalId="test-hospital" />);
    
    // Check if main elements are rendered
    expect(screen.getByText('Prescription Template Editor')).toBeInTheDocument();
    expect(screen.getByText('Toolbar')).toBeInTheDocument();
    expect(screen.getByText('Add Text')).toBeInTheDocument();
    expect(screen.getByText('Add Doctor Token')).toBeInTheDocument();
  });

  it('shows welcome modal on first load', () => {
    render(<PrescriptionCanvasEditor hospitalId="test-hospital" />);
    
    expect(screen.getByText('Welcome to Prescription Canvas Editor!')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('displays help button', () => {
    render(<PrescriptionCanvasEditor hospitalId="test-hospital" />);
    
    // Close welcome modal first
    screen.getByText('Get Started').click();
    
    // Check if help button is present
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
  });
});
