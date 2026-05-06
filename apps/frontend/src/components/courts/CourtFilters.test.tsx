import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourtFilters } from './CourtFilters';
import { vi } from 'vitest';

describe('CourtFilters', () => {
  it('should render search input', () => {
    const onFilterChange = vi.fn();
    render(<CourtFilters onFilterChange={onFilterChange} />);
    expect(screen.getByPlaceholderText('Tìm kiếm theo tên sân...')).toBeInTheDocument();
  });

  it('should render sport type dropdown with all options', () => {
    const onFilterChange = vi.fn();
    render(<CourtFilters onFilterChange={onFilterChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Check all options are present
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getByText('Cầu lông')).toBeInTheDocument();
    expect(screen.getByText('Tennis')).toBeInTheDocument();
    expect(screen.getByText('Bóng đá')).toBeInTheDocument();
    expect(screen.getByText('Bóng rổ')).toBeInTheDocument();
    expect(screen.getByText('Bóng chuyền')).toBeInTheDocument();
  });

  it('should debounce search input and call onFilterChange after 400ms', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<CourtFilters onFilterChange={onFilterChange} />);

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tên sân...');

    // Type in search input
    await user.type(searchInput, 'Sân A');

    // Should not call immediately
    expect(onFilterChange).not.toHaveBeenCalled();

    // Wait for debounce (400ms)
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith({
          name: 'Sân A',
          sportType: undefined,
        });
      },
      { timeout: 500 },
    );
  });

  it('should call onFilterChange when sport type changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<CourtFilters onFilterChange={onFilterChange} />);

    const select = screen.getByRole('combobox');

    // Change sport type
    await user.selectOptions(select, 'badminton');

    // Wait for debounce
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith({
          name: undefined,
          sportType: 'badminton',
        });
      },
      { timeout: 500 },
    );
  });

  it('should call onFilterChange with both filters', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<CourtFilters onFilterChange={onFilterChange} />);

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tên sân...');
    const select = screen.getByRole('combobox');

    // Set both filters
    await user.type(searchInput, 'Tennis');
    await user.selectOptions(select, 'tennis');

    // Wait for debounce
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith({
          name: 'Tennis',
          sportType: 'tennis',
        });
      },
      { timeout: 500 },
    );
  });
});
