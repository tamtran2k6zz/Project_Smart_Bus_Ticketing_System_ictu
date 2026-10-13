import { useState } from 'react';
import { appConfig } from '@/configs/app.config';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { adminApi } from '../services/admin.api';
import { roleLabels, rolePermissions } from '@/configs/permissions';
import type { User, Role, Permission } from '@/features/auth/types';
import {
  PageTitle,
  Card,
  Button,
  Badge,
  Field,
  Modal,
  AsyncState,
  ActionMessage,
} from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';
const permissionLabels: Record<Permission, string> = {
  operations: 'Vận hành',
  reports: 'Báo cáo & hoàn tiền',
  promotions: 'Voucher',
  users: 'Tài khoản & quyền',
  audit: 'Nhật ký',
  support: 'Hỗ trợ & xử lý vé',
  eligibility: 'Duyệt ưu đãi',
  'check-in': 'Soát vé',
};
export function UserManagement() {
  const user = useSession(s => s.user)!;
  const query = useQuery({ queryKey: ['users', user.id], queryFn: () => adminApi.users(user.id) });
  const [editing, setEditing] = useState<User | null>(null);
  const action = useAction(async () => {
    if (!editing) return;
    await adminApi.update(user.id, editing.id, editing.role, editing.active, editing.permissions);
    setEditing(null);
  }, 'Đã cập nhật quyền và trạng thái tài khoản.');
  return (
    <>
      <PageTitle
        title="Tài khoản & phân quyền"
        description="Tạo tài khoản, phân vai trò và khóa tài khoản. Backend kiểm tra quyền trên từng API."
      />
      <ActionMessage action={action} />
      <UserCreateForm />
      <AsyncState query={query}>
        <Card>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Quyền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map(u => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <p className="muted">{u.email}</p>
                    </td>
                    <td>{roleLabels[u.role]}</td>
                    <td>
                      {u.permissions.map(p => permissionLabels[p]).join(', ') || 'Hành khách'}
                    </td>
                    <td>
                      <Badge tone={u.active ? 'green' : 'red'}>
                        {u.active ? 'Hoạt động' : 'Tạm khóa'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        disabled={u.id === user.id}
                        onClick={() => {
                          action.clear();
                          setEditing(structuredClone(u));
                        }}
                      >
                        Chỉnh quyền
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AsyncState>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Chỉnh quyền tài khoản">
        {editing && (
          <div className="stack">
            <strong>{editing.name}</strong>
            <Field label="Vai trò">
              <select
                value={editing.role}
                onChange={e => {
                  const role = e.target.value as Role;
                  setEditing({ ...editing, role, permissions: [...rolePermissions[role]] });
                }}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select
                value={String(editing.active)}
                onChange={e => setEditing({ ...editing, active: e.target.value === 'true' })}
              >
                <option value="true">Hoạt động</option>
                <option value="false">Tạm khóa</option>
              </select>
            </Field>
            <strong style={{ fontSize: 13 }}>Quyền theo vai trò</strong>
            {rolePermissions[editing.role].map(p => (
              <label key={p} className="row muted">
                <input
                  type="checkbox"
                  disabled={!appConfig.demo}
                  checked={editing.permissions.includes(p)}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      permissions: e.target.checked
                        ? [...editing.permissions, p]
                        : editing.permissions.filter(x => x !== p),
                    })
                  }
                />
                {permissionLabels[p]}
              </label>
            ))}
            <ActionMessage action={action} />
            <Button disabled={action.isPending} onClick={() => action.mutate(undefined)}>
              Lưu quyền
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
export function AuditLog() {
  const user = useSession(s => s.user)!;
  const query = useQuery({ queryKey: ['audit', user.id], queryFn: () => adminApi.logs(user.id) });
  return (
    <>
      <PageTitle
        title="Nhật ký hoạt động"
        description="Nhật ký truy cập, đăng nhập và thao tác; không lưu mật khẩu hoặc token."
      />
      <AsyncState query={query} empty={query.data?.length === 0} emptyText="Chưa có hoạt động">
        <Card>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người thực hiện</th>
                  <th>Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map(a => (
                  <tr key={a.id}>
                    <td>{dateTime(a.createdAt)}</td>
                    <td>{a.actor}</td>
                    <td>
                      {a.action}{' '}
                      {a.statusCode != null && (
                        <Badge tone={a.statusCode < 400 ? 'green' : 'red'}>{a.statusCode}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AsyncState>
    </>
  );
}
function UserCreateForm() {
  const actor = useSession(s => s.user)!;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'PASSENGER' as Role,
  });
  const create = useAction(async () => {
    await adminApi.create(actor.id, form);
    setOpen(false);
    setForm({ name: '', email: '', phone: '', password: '', role: 'PASSENGER' });
  }, 'Đã tạo tài khoản.');
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Tạo tài khoản
      </Button>
      <ActionMessage action={create} />
      <Modal open={open} onClose={() => setOpen(false)} title="Tạo tài khoản">
        <form
          className="stack"
          onSubmit={e => {
            e.preventDefault();
            create.mutate(undefined);
          }}
        >
          <Field label="Họ tên">
            <input
              required
              minLength={2}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Số điện thoại">
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Mật khẩu (ít nhất 10 ký tự)">
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Vai trò">
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as Role })}
            >
              {Object.entries(roleLabels).map(([r, label]) => (
                <option key={r} value={r}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <ActionMessage action={create} />
          <Button disabled={create.isPending}>Lưu tài khoản</Button>
        </form>
      </Modal>
    </>
  );
}
