import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourtFilters } from './CourtFilters';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({
    data: [
      { id: 'f1', name: 'Wifi', icon: 'WIFI' },
      { id: 'f2', name: 'Parking', icon: 'PARK' },
    ],
  }),
}));

vi.mock('@/hooks/useSportTypes', () => ({
  useSportTypes: () => ({
    data: [
      { id: 's1', name: 'Badminton' },
      { id: 's2', name: 'Tennis' },
    ],
  }),
}));

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
  it('renders search input', () => {
    const onFilterChange = vi.fn();
    render(<CourtFilters onFilterChange={onFilterChange} />);
    expect(screen.getByPlaceholderText('Search venues...')).toBeInTheDocument();
  });

  it('emits sportTypeIds when sport filter is selected', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<CourtFilters onFilterChange={onFilterChange} />);

    onFilterChange.mockClear();

    await user.click(screen.getByRole('button', { name: /sport/i }));
    await user.click(screen.getByLabelText('Badminton'));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ sportTypeIds: ['s1'] }),
      );
    });
  });
});
