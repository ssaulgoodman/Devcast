import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PaginationControls from '../../src/components/PaginationControls';

describe('PaginationControls', () => {
  const defaultProps = {
    pagination: {
      total: 100,
      page: 1,
      limit: 10,
      pages: 10
    },
    onPageChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination controls correctly', () => {
    render(<PaginationControls {...defaultProps} />);
    
    // Use getAllByRole to find all buttons, then check their text content
    const buttons = screen.getAllByRole('button');
    expect(buttons.some(btn => btn.textContent?.includes('1'))).toBe(true);
    expect(buttons.some(btn => btn.textContent?.includes('2'))).toBe(true);
    expect(buttons.some(btn => btn.textContent?.includes('Previous'))).toBe(true);
    expect(buttons.some(btn => btn.textContent?.includes('Next'))).toBe(true);
  });

  it('disables the Previous button on first page', () => {
    render(<PaginationControls {...defaultProps} />);
    
    // Find the previous button by role and name
    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('disables the Next button on last page', () => {
    render(
      <PaginationControls 
        {...defaultProps} 
        pagination={{ ...defaultProps.pagination, page: 10 }} 
      />
    );
    
    // Find the next button by role and name
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when clicking Next button', () => {
    render(<PaginationControls {...defaultProps} />);
    
    // Find the next button by role and name
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking Previous button', () => {
    render(
      <PaginationControls 
        {...defaultProps} 
        pagination={{ ...defaultProps.pagination, page: 2 }} 
      />
    );
    
    // Find the previous button by role and name
    const previousButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(previousButton);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange when clicking a page number', () => {
    render(<PaginationControls {...defaultProps} />);
    
    // Find buttons by their text content
    const buttons = screen.getAllByRole('button');
    // Find the button with text "2"
    const pageButton = buttons.find(btn => btn.textContent === '2');
    expect(pageButton).toBeTruthy();
    
    // Click the page 2 button
    if (pageButton) {
      fireEvent.click(pageButton);
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    }
  });

  it('displays truncated pagination when there are many pages', () => {
    render(
      <PaginationControls 
        {...defaultProps} 
        pagination={{ ...defaultProps.pagination, pages: 20 }} 
      />
    );
    
    // Find page buttons and check their content
    const buttons = screen.getAllByRole('button');
    
    // First page should be shown
    const page1Button = buttons.find(btn => btn.textContent === '1');
    expect(page1Button).toBeTruthy();
    
    // Last page should be shown
    const page20Button = buttons.find(btn => btn.textContent === '20');
    expect(page20Button).toBeTruthy();
    
    // Ellipsis should appear
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('shows appropriate range of pages when on middle page', () => {
    render(
      <PaginationControls 
        {...defaultProps} 
        pagination={{ ...defaultProps.pagination, page: 5, pages: 10 }} 
      />
    );
    
    // Find page buttons and check their content
    const buttons = screen.getAllByRole('button');
    
    // Should show current page and surrounding pages
    const page4Button = buttons.find(btn => btn.textContent === '4');
    const page5Button = buttons.find(btn => btn.textContent === '5');
    const page6Button = buttons.find(btn => btn.textContent === '6');
    
    expect(page4Button).toBeTruthy();
    expect(page5Button).toBeTruthy();
    expect(page6Button).toBeTruthy();
  });

  it('handles zero pages case', () => {
    render(
      <PaginationControls 
        {...defaultProps} 
        pagination={{ ...defaultProps.pagination, pages: 0, total: 0 }} 
      />
    );
    
    // Should not show any page numbers
    const navigationElement = screen.getByRole('navigation');
    expect(within(navigationElement).queryByText('1')).not.toBeInTheDocument();
    
    // Previous and Next buttons should be disabled
    const previousButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });
}); 