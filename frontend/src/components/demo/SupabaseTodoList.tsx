import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase/client';

interface Todo {
  id: string | number;
  name: string;
}

export const SupabaseTodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodos() {
      try {
        const { data, error: queryError } = await supabase.from('todos').select('*');
        if (queryError) throw queryError;
        setTodos((data as Todo[]) || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không thể kết nối bảng todos');
      } finally {
        setLoading(false);
      }
    }

    fetchTodos();
  }, []);

  if (loading) return <div style={{ padding: '1rem' }}>Đang tải dữ liệu từ Supabase...</div>;
  if (error) return <div style={{ padding: '1rem', color: '#ef4444' }}>Lưu ý Supabase: {error}</div>;

  return (
    <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '8px' }}>
      <h3>Dữ liệu từ Supabase Cloud</h3>
      {todos.length === 0 ? (
        <p>Chưa có bản ghi nào trong bảng 'todos'.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>{todo.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SupabaseTodoList;
