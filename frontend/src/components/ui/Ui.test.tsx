import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SearchForm } from '@/features/booking/components/SearchForm';
import { AsyncState, Field } from './Ui';
import { OrderedStopSelector } from '@/components/data-display/OrderedStopSelector';
afterEach(cleanup);
describe('shared feedback and search form', () => {
  it('selects and reorders route stops with named keyboard accessible controls', () => {
    const change = vi.fn();
    render(
      <OrderedStopSelector
        label="Trạm đi qua theo thứ tự"
        options={[
          { value: 's1', label: 'Bến xe' },
          { value: 's2', label: 'Đại học ICTU' },
          { value: 's3', label: 'Hồ Núi Cốc' },
        ]}
        value={['s1', 's2']}
        onChange={change}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hồ Núi Cốc' }));
    expect(change).toHaveBeenLastCalledWith(['s1', 's2', 's3']);
    expect(screen.getByRole('button', { name: 'Đưa lên Bến xe' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Đưa lên Đại học ICTU' }));
    expect(change).toHaveBeenLastCalledWith(['s2', 's1']);
  });
  it('associates nested controls with validation and hint descriptions', () => {
    const { rerender } = render(
      <Field label="Email" hint="Dùng email của bạn" error="Email không hợp lệ">
        <div>
          <input aria-label="Email" />
        </div>
      </Field>
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Dùng email của bạn Email không hợp lệ');
    rerender(
      <Field label="Email" hint="Dùng email của bạn">
        <div>
          <input aria-label="Email" />
        </div>
      </Field>
    );
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('Dùng email của bạn');
  });
  it('keeps distinct error/empty/loading states and retry action', () => {
    const retry = vi.fn();
    const { rerender } = render(
      <AsyncState query={{ isPending: true, isError: false, error: null, refetch: retry }}>
        <p>Content</p>
      </AsyncState>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
    rerender(
      <AsyncState
        query={{ isPending: false, isError: true, error: new Error('Mất mạng'), refetch: retry }}
      >
        <p>Content</p>
      </AsyncState>
    );
    fireEvent.click(screen.getByText('Thử lại'));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng');
    rerender(
      <AsyncState query={{ isPending: false, isError: false, error: null, refetch: retry }} empty>
        <p>Content</p>
      </AsyncState>
    );
    expect(screen.getByText('Chưa có dữ liệu.')).toBeVisible();
  });
  it('navigates with search date and validates identical stops', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<SearchForm initial={{ date: '2099-10-07' }} />} />
            <Route path="/trips" element={<p>Kết quả tra cứu</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tìm chuyến' }));
    expect(await screen.findByText('Kết quả tra cứu')).toBeVisible();
    client.clear();
  });
});
