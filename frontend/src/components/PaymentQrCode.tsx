import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PaymentQrCodeProps {
  value: string;
  size?: number;
  alt: string;
  showDownload?: boolean;
  downloadFileName?: string;
}

export const PaymentQrCode: React.FC<PaymentQrCodeProps> = ({
  value,
  size = 220,
  alt,
  showDownload = false,
  downloadFileName = 'smartbus-qr-code.png',
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDataUrl(null);
    setError(null);
    QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M' })
      .then(result => {
        if (active) setDataUrl(result);
      })
      .catch((qrError: unknown) => {
        if (active) {
          setError(qrError instanceof Error ? qrError.message : 'Không thể tạo mã QR.');
        }
      });
    return () => {
      active = false;
    };
  }, [size, value]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return <span role="alert">Lỗi tạo mã QR: {error}</span>;
  }
  if (!dataUrl) return <span aria-live="polite">Đang tạo mã QR…</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <img src={dataUrl} alt={alt} width={size} height={size} style={{ borderRadius: '8px' }} />
      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          style={{
            marginTop: '4px',
            padding: '6px 14px',
            background: '#0369a1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(3, 105, 161, 0.3)',
          }}
        >
          📥 Lưu ảnh QR về máy
        </button>
      )}
    </div>
  );
};
