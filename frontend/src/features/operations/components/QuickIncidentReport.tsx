import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  TrafficCone,
  Wrench,
} from 'lucide-react';
import { ActionMessage, Button, Card } from '@/components/ui/Ui';
import { useAction } from '@/hooks/useAction';
import type { Trip } from '@/features/booking/types';
import { operationsApi } from '../services/operations.api';
import styles from './QuickIncidentReport.module.css';

type IncidentCategory = 'traffic' | 'breakdown' | 'other';

const categories: {
  id: IncidentCategory;
  label: string;
  description: string;
  Icon: typeof TrafficCone;
}[] = [
  {
    id: 'traffic',
    label: 'Tắc đường',
    description: 'Ùn tắc, đường bị chặn hoặc xe di chuyển chậm',
    Icon: TrafficCone,
  },
  {
    id: 'breakdown',
    label: 'Hỏng xe',
    description: 'Xe gặp trục trặc kỹ thuật, cần hỗ trợ',
    Icon: Wrench,
  },
  {
    id: 'other',
    label: 'Sự cố khác',
    description: 'Tình huống khác cần báo cho điều hành',
    Icon: AlertTriangle,
  },
];

export function QuickIncidentReport({
  userId,
  trips,
}: {
  userId: string;
  trips: Trip[];
}) {
  const [tripId, setTripId] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('traffic');
  const [details, setDetails] = useState('');
  const selectedCategory = categories.find(item => item.id === category) ?? categories[0];
  const isOther = category === 'other';
  const detailsTooShort = isOther && details.trim().length < 10;

  useEffect(() => {
    // Preselect only when there is a single assigned trip; avoid reporting against the wrong trip.
    if (!trips.some(trip => trip.id === tripId)) {
      setTripId(trips.length === 1 ? trips[0].id : '');
    }
  }, [trips, tripId]);

  const report = useAction(async () => {
    if (!tripId) throw new Error('Vui lòng chọn chuyến đang gặp sự cố.');
    if (isOther && details.trim().length < 10) {
      throw new Error('Với mục “Sự cố khác”, vui lòng mô tả ít nhất 10 ký tự.');
    }

    const description = details.trim();
    const message = description
      ? `${selectedCategory.label}: ${description}`
      : `Báo sự cố nhanh: ${selectedCategory.label}. Cần hỗ trợ điều hành.`;

    await operationsApi.reportIncident(userId, tripId, message);
    setDetails('');
  }, 'Đã gửi báo cáo sự cố cho điều hành.');

  return (
    <Card className={styles.card}>
      <form
        className={styles.form}
        onSubmit={event => {
          event.preventDefault();
          report.mutate(undefined);
        }}
      >
        <div className={styles.intro}>
          <span className={styles.introIcon} aria-hidden="true">
            <AlertTriangle size={23} />
          </span>
          <div>
            <h2 className={styles.title}>Báo cáo sự cố nhanh</h2>
            <p className={styles.subtitle}>
              Chọn loại sự cố để điều hành nắm tình hình và hỗ trợ kịp thời.
            </p>
          </div>
        </div>

        <fieldset className={styles.categoryFieldset}>
          <legend className={styles.sectionLabel}>1. Loại sự cố</legend>
          <div className={styles.categoryGrid}>
            {categories.map(({ id, label, description, Icon }) => (
              <button
                className={styles.categoryButton}
                data-category={id}
                type="button"
                key={id}
                aria-pressed={category === id}
                onClick={() => {
                  setCategory(id);
                  report.clear();
                }}
              >
                <span className={styles.categoryIcon} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className={styles.categoryText}>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                {category === id && (
                  <CheckCircle2 className={styles.selectedIcon} size={18} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.sectionLabel}>2. Chuyến đang gặp sự cố</span>
            <select
              value={tripId}
              required
              disabled={trips.length === 0}
              onChange={event => {
                setTripId(event.target.value);
                report.clear();
              }}
            >
              <option value="">{trips.length ? 'Chọn chuyến' : 'Chưa có chuyến được phân công'}</option>
              {trips.map(trip => (
                <option value={trip.id} key={trip.id}>
                  {trip.id} · {new Date(trip.departure).toLocaleString('vi-VN')}
                </option>
              ))}
            </select>
            {trips.length === 0 && (
              <small className={styles.helper}>
                Bạn chưa có chuyến được phân công để báo cáo sự cố. Hãy kiểm tra lại mục “Chuyến được phân công”.
              </small>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.sectionLabel}>
              3. Mô tả thêm {isOther ? '(bắt buộc)' : '(không bắt buộc)'}
            </span>
            <textarea
              value={details}
              onChange={event => setDetails(event.target.value)}
              placeholder={
                isOther
                  ? 'Mô tả sự cố và vị trí xảy ra (ít nhất 10 ký tự)…'
                  : 'Ví dụ: Tắc đường tại ngã tư…, dự kiến chậm 10 phút…'
              }
              rows={3}
              maxLength={300}
              minLength={isOther ? 10 : undefined}
              required={isOther}
              aria-describedby="incident-details-hint"
            />
            <small id="incident-details-hint" className={styles.helper}>
              {isOther
                ? 'Mô tả ít nhất 10 ký tự để điều hành hiểu tình huống.'
                : 'Có thể bỏ trống để gửi báo cáo nhanh; thêm vị trí hoặc tình trạng nếu cần.'}
              <span className={styles.counter}>{details.length}/300</span>
            </small>
          </label>
        </div>

        <div className={styles.actions}>
          <p className={styles.privacyNote}>
            Báo cáo sẽ gắn với chuyến đã chọn và xuất hiện trong lịch sử sự cố.
          </p>
          <Button
            type="submit"
            className={styles.submitButton}
            disabled={!tripId || trips.length === 0 || detailsTooShort || report.isPending}
          >
            <Send size={17} />
            {report.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
          </Button>
        </div>
        <ActionMessage action={report} />
      </form>
    </Card>
  );
}
