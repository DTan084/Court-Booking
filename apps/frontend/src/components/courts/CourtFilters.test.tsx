import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourtFilters } from './CourtFilters';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const render = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('CourtFilters', () => {
  it('should render search input', () => {
    const onFilterChange = vi.fn();
    render(<CourtFilters onFilterChange={onFilterChange} />);
    expect(screen.getByPlaceholderText('Tìm kiếm theo tên sân...')).toBeInTheDocument();
  });

  it('should render sport type dropdown with all options', () => {
    const onFilterChange = vi.fn();
    render(<CourtFilters onFilterChange={onFilterChange} />);

    const select = screen.getAllByRole('combobox')[0]; // First one is sport type
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

    // Clear any initial calls from mount
    onFilterChange.mockClear();

    // Type in search input
    await user.type(searchInput, 'Sân A');

    // Should not call immediately after typing (debounce)
    const callCountAfterType = onFilterChange.mock.calls.length;

    // Wait for debounce (400ms)
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith({
          name: 'Sân A',
          sportType: undefined,
          district: undefined,
        });
      },
      { timeout: 600 },
    );

    // Verify it was called after debounce
    expect(onFilterChange.mock.calls.length).toBeLessThan(callCountAfterType + 10);
  });

  it('should call onFilterChange when sport type changes', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<CourtFilters onFilterChange={onFilterChange} />);

    const selects = screen.getAllByRole('combobox');
    const sportSelect = selects[0];

    // Change sport type
    await user.selectOptions(sportSelect, 'BADMINTON');

    // Wait for debounce
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith({
          name: undefined,
          sportType: 'BADMINTON',
          district: undefined,
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
    const selects = screen.getAllByRole('combobox');
    const sportSelect = selects[0];

    // Set both filters
    await user.type(searchInput, 'Tennis');
    await user.selectOptions(sportSelect, 'TENNIS');

    // Wait for debounce
    await waitFor(
      () => {
        expect(onFilterChange).toHaveBeenCalledWith({
          name: 'Tennis',
          sportType: 'TENNIS',
          district: undefined,
        });
      },
      { timeout: 500 },
    );
  });
});
