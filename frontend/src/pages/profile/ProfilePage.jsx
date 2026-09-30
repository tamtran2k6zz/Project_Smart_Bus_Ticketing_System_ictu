import React, { useState } from 'react';
import { User, Mail, Phone, Shield, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    updateProfile({
      name: formData.name,
      phone: formData.phone,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Hồ sơ cá nhân
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Thông tin tài khoản đăng nhập và dữ liệu cá nhân của bạn trên hệ thống SmartBus ICTU.
        </p>
      </div>

      {savedSuccess && (
        <Alert
          type="success"
          message="Cập nhật thông tin tài khoản thành công!"
          onClose={() => setSavedSuccess(false)}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {/* User Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-600 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              <Shield className="w-3 h-3" />
              Vai trò: {user?.role || 'CUSTOMER'}
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <Input
            label="Họ và tên"
            id="profile-name"
            name="name"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            leadingIcon={User}
            required
          />

          <Input
            label="Địa chỉ Email"
            id="profile-email"
            name="email"
            value={formData.email}
            disabled
            helperText="Địa chỉ email tài khoản không thể thay đổi."
            leadingIcon={Mail}
          />

          <Input
            label="Số điện thoại liên hệ"
            id="profile-phone"
            name="phone"
            value={formData.phone}
            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
            leadingIcon={Phone}
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" size="md" icon={Save}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
