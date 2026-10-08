import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Search, MapPin, CalendarDays } from 'lucide-react';
import { operationsApi } from '@/features/operations/services/operations.api';
import { Button, Field } from '@/components/ui/Ui';
import { localDay } from '@/utils/format';
import s from './Booking.module.css';
const schema = z
  .object({
    from: z.string(),
    to: z.string(),
    date: z
      .string()
      .min(1, 'Chọn ngày')
      .refine(d => d >= localDay(), 'Chọn ngày hôm nay hoặc tương lai'),
    time: z.string(),
  })
  .refine(v => !v.from || !v.to || v.from !== v.to, {
    message: 'Điểm đi và đến phải khác nhau',
    path: ['to'],
  });
export function SearchForm({ initial = {} }: { initial?: Record<string, string> }) {
  const navigate = useNavigate();
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { from: '', to: '', date: localDay(), time: '', ...initial },
  });
  return (
    <form
      className={s.search}
      onSubmit={handleSubmit(values => navigate('/trips?' + new URLSearchParams(values)))}
      aria-label="Tra cứu chuyến"
    >
      <Field label="ĐIỂM ĐI">
        <div className={s.inputIcon}>
          <MapPin size={17} />
          <select {...register('from')} aria-label="Điểm đi">
            <option value="">Tất cả điểm đi</option>
            {catalog.data?.stops.map(stop => (
              <option key={stop.id}>{stop.name}</option>
            ))}
          </select>
        </div>
      </Field>
      <Button
        variant="secondary"
        type="button"
        className={s.swap}
        aria-label="Đổi chiều"
        onClick={() => {
          const v = getValues();
          setValue('from', v.to);
          setValue('to', v.from);
        }}
      >
        <ArrowLeftRight size={17} />
      </Button>
      <Field label="ĐIỂM ĐẾN" error={errors.to?.message}>
        <div className={s.inputIcon}>
          <MapPin size={17} />
          <select {...register('to')} aria-label="Điểm đến">
            <option value="">Tất cả điểm đến</option>
            {catalog.data?.stops.map(stop => (
              <option key={stop.id}>{stop.name}</option>
            ))}
          </select>
        </div>
      </Field>
      <Field label="NGÀY KHỞI HÀNH" error={errors.date?.message}>
        <div className={s.inputIcon}>
          <CalendarDays size={17} />
          <input type="date" min={localDay()} {...register('date')} aria-label="Ngày khởi hành" />
        </div>
      </Field>
      <Field label="TỪ GIỜ">
        <input type="time" {...register('time')} aria-label="Từ giờ" />
      </Field>
      <Button type="submit">
        <Search size={18} />
        Tìm chuyến
      </Button>
      {catalog.isError && (
        <p className="full" role="alert">
          Chưa tải được danh mục trạm.{' '}
          <button type="button" onClick={() => catalog.refetch()}>
            Thử lại
          </button>
        </p>
      )}
    </form>
  );
}
