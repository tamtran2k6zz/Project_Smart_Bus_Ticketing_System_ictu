import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorText } from '@/utils/format';
export function useAction<T>(
  action: (data: T) => Promise<unknown>,
  success = 'Đã cập nhật thành công.'
) {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: action,
    onSuccess: async () => {
      setMessage(success);
      await client.invalidateQueries();
    },
    onError: () => setMessage(''),
  });
  return {
    ...mutation,
    message,
    errorMessage: mutation.error ? errorText(mutation.error) : '',
    clear: () => {
      setMessage('');
      mutation.reset();
    },
  };
}
