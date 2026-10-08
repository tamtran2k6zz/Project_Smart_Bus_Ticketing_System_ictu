import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { OrderedStopSelector } from './OrderedStopSelector';
import type { ZodType } from 'zod';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useAction } from '@/hooks/useAction';
import {
  PageTitle,
  Card,
  Button,
  Field,
  AsyncState,
  Modal,
  ActionMessage,
  Badge,
} from '@/components/ui/Ui';
import { inputDateTime } from '@/utils/format';
export interface DataField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'checkbox' | 'select' | 'datetime-local' | 'multiple' | 'ordered';
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}
export interface DataColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
}
export function DataManager({
  title,
  description,
  queryKey,
  fields,
  columns,
  schema,
  load,
  save,
  remove,
}: {
  title: string;
  description: string;
  queryKey: string;
  fields: DataField[];
  columns: DataColumn[];
  schema: ZodType;
  load: () => Promise<Record<string, unknown>[]>;
  save: (data: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}) {
  const query = useQuery({ queryKey: [queryKey], queryFn: load });
  const [search, setSearch] = useState(''),
    [editing, setEditing] = useState<Record<string, unknown> | null>(null),
    [deleting, setDeleting] = useState('');
  const form = useForm<Record<string, unknown>>();
  const values = useWatch({ control: form.control });
  const saveAction = useAction(async (data: Record<string, unknown>) => {
    await save({ ...data, ...(editing?.id ? { id: editing.id } : {}) });
    setEditing(null);
  }, 'Đã lưu bản ghi.');
  const deleteAction = useAction(async () => {
    await remove(deleting);
    setDeleting('');
  }, 'Đã xóa bản ghi.');
  const edit = (row: Record<string, unknown>) => {
    const defaults = Object.fromEntries(
      fields.map(field => {
        let value =
          row[field.name] ??
          field.defaultValue ??
          (field.type === 'checkbox'
            ? true
            : ['multiple', 'ordered'].includes(field.type || '')
              ? []
              : '');
        if (field.type === 'datetime-local' && typeof value === 'string' && value)
          value = inputDateTime(value);
        return [field.name, value];
      })
    );
    form.reset(defaults);
    saveAction.clear();
    setEditing(row);
  };
  const rows = query.data?.filter(row =>
    Object.values(row).some(value =>
      String(value).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))
    )
  );
  return (
    <>
      <PageTitle
        eyebrow="QUẢN LÝ DANH MỤC"
        title={title}
        description={description}
        action={
          <Button onClick={() => edit({})}>
            <Plus size={17} />
            Thêm mới
          </Button>
        }
      />
      <ActionMessage action={saveAction} />
      <ActionMessage action={deleteAction} />
      <Card>
        <div className="row" style={{ marginBottom: 20, maxWidth: 400 }}>
          <Search size={18} />
          <input
            style={{ flex: 1 }}
            aria-label="Tìm trong danh sách"
            placeholder="Tìm trong danh sách…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <AsyncState query={query} empty={rows?.length === 0} emptyText="Chưa có bản ghi phù hợp">
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  {columns.map(c => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map(row => (
                  <tr key={String(row.id)}>
                    {columns.map(c => (
                      <td key={c.key}>
                        {typeof row[c.key] === 'boolean' ? (
                          <Badge tone={row[c.key] ? 'green' : 'neutral'}>
                            {row[c.key] ? 'Bật' : 'Tắt'}
                          </Badge>
                        ) : c.format ? (
                          c.format(row[c.key], row)
                        ) : (
                          String(row[c.key] ?? '—')
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row">
                        <Button
                          variant="ghost"
                          aria-label={'Sửa ' + String(row.name || row.code || row.id)}
                          onClick={() => edit(row)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={'Xóa ' + String(row.name || row.code || row.id)}
                          onClick={() => {
                            deleteAction.clear();
                            setDeleting(String(row.id));
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </Card>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Chỉnh sửa bản ghi' : 'Thêm bản ghi'}
      >
        <form
          className="formGrid"
          onSubmit={form.handleSubmit(data => {
            const normalized = { ...data };
            fields
              .filter(f => f.type === 'datetime-local')
              .forEach(f => {
                if (typeof normalized[f.name] === 'string' && normalized[f.name])
                  normalized[f.name] = new Date(normalized[f.name] + '+07:00').toISOString();
              });
            const parsed = schema.safeParse(normalized);
            if (!parsed.success) {
              parsed.error.issues.forEach(issue =>
                form.setError(String(issue.path[0]), { message: issue.message })
              );
              return;
            }
            saveAction.mutate(parsed.data as Record<string, unknown>);
          })}
        >
          {fields.map(f =>
            f.type === 'ordered' ? (
              <OrderedStopSelector
                key={f.name}
                label={f.label}
                options={f.options}
                value={(values[f.name] || []) as string[]}
                error={form.formState.errors[f.name]?.message as string | undefined}
                onChange={value => form.setValue(f.name, value, { shouldDirty: true })}
              />
            ) : (
              <Field
                key={f.name}
                label={f.label}
                error={form.formState.errors[f.name]?.message as string | undefined}
              >
                {f.type === 'checkbox' ? (
                  <input type="checkbox" {...form.register(f.name)} />
                ) : f.type === 'select' || f.type === 'multiple' ? (
                  <select
                    multiple={f.type === 'multiple'}
                    style={f.type === 'multiple' ? { minHeight: 120 } : undefined}
                    {...form.register(f.name)}
                  >
                    {f.type !== 'multiple' && <option value="">Chọn giá trị</option>}
                    {f.options?.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    {...form.register(f.name)}
                  />
                )}
              </Field>
            )
          )}
          <div className="full">
            <ActionMessage action={saveAction} />
            <div className="row">
              <Button disabled={saveAction.isPending}>Lưu bản ghi</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting('')} title="Xóa bản ghi">
        <p className="muted">
          Xác nhận xóa bản ghi này. Bản ghi đang được sử dụng sẽ được dịch vụ từ chối xóa.
        </p>
        <ActionMessage action={deleteAction} />
        <div className="row">
          <Button
            variant="danger"
            disabled={deleteAction.isPending}
            onClick={() => deleteAction.mutate(undefined)}
          >
            Xác nhận xóa
          </Button>
          <Button variant="secondary" onClick={() => setDeleting('')}>
            Đóng
          </Button>
        </div>
      </Modal>
    </>
  );
}
