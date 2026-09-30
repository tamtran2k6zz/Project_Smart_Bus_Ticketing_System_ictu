import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';
import Button from '../../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6">
        <HelpCircle className="w-10 h-10" />
      </div>

      <span className="text-xs font-bold tracking-widest text-blue-600 uppercase px-3 py-1 rounded-full bg-blue-50 border border-blue-200 mb-3">
        Lỗi 404 • Không tìm thấy trang
      </span>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Trang bạn tìm kiếm không tồn tại
      </h1>

      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        Đường dẫn bạn vừa truy cập có thể đã bị thay đổi, gỡ bỏ hoặc bạn đã nhập sai địa chỉ URL.
      </p>

      <Link to="/">
        <Button variant="primary" size="md" icon={Home}>
          Quay lại Trang chủ
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
