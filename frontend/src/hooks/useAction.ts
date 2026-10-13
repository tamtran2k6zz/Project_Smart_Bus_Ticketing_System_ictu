import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorText } from '@/utils/format';
export function useAction<T, R = unknown>(
  action: (data: T) => Promise<R>,
  success: string | ((result: R) => string) = 'Đã cập nhật thành công.'
) {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: action,
    onSuccess: async result => {
      setMessage(typeof success === 'function' ? success(result) : success);
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
