import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import s from './OrderedStopSelector.module.css';
export function OrderedStopSelector({
  label,
  options = [],
  value,
  onChange,
  error,
}: {
  label: string;
  options?: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  function move(index: number, direction: number) {
    const next = [...value];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  }
  return (
    <fieldset className={s.fieldset}>
      <legend>{label}</legend>
      <p>Chọn trạm, sau đó xếp thứ tự từ điểm đầu đến điểm cuối.</p>
      <div className={s.choices}>
        {options.map(option => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={e =>
                onChange(
                  e.target.checked
                    ? [...value, option.value]
                    : value.filter(v => v !== option.value)
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
      <ol className={s.order}>
        {value.map((id, index) => (
          <li key={id}>
            <span>
              {index + 1}. {options.find(o => o.value === id)?.label || id}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={index === 0}
              aria-label={'Đưa lên ' + (options.find(o => o.value === id)?.label || id)}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={index === value.length - 1}
              aria-label={'Đưa xuống ' + (options.find(o => o.value === id)?.label || id)}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={16} />
            </Button>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
