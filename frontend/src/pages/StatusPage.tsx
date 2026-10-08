import { Card, LinkButton, PageTitle } from '@/components/ui/Ui';
export default function StatusPage({ code }: { code: 403 | 404 }) {
  return (
    <div className="container" style={{ paddingBlock: 70 }}>
      <Card>
        <PageTitle
          eyebrow={String(code)}
          title={code === 403 ? 'Bạn chưa có quyền truy cập' : 'Không tìm thấy trang'}
          description={
            code === 403
              ? 'Đăng nhập bằng tài khoản có quyền phù hợp để mở màn hình này.'
              : 'Đường dẫn có thể đã thay đổi. Hãy trở về trang chủ hoặc tra cứu chuyến.'
          }
        />
        <div className="row">
          <LinkButton to="/">Về trang chủ</LinkButton>
          <LinkButton secondary to="/login">
            Đăng nhập
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
