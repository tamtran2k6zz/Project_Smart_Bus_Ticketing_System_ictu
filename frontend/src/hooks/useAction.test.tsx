import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAction } from './useAction';

afterEach(cleanup);
it.each([0, 6])(
  'shows the actual completed trip count (%i) returned by the server',
  async count => {
    function Cleanup() {
      const action = useAction(
        async () => ({ message: `Đã hoàn tất ${count} chuyến xe đã qua giờ đến dự kiến.` }),
        result => result.message
      );
      return (
        <>
          <button onClick={() => action.mutate(undefined)}>Giải phóng</button>
          <output>{action.message}</output>
        </>
      );
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Cleanup />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Giải phóng' }));
    expect(
      await screen.findByText(`Đã hoàn tất ${count} chuyến xe đã qua giờ đến dự kiến.`)
    ).toBeVisible();
  }
);
