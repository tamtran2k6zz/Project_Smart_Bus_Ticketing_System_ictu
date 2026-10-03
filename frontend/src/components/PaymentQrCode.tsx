import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PaymentQrCodeProps {
  value: string;
  size?: number;
  alt: string;
}

export const PaymentQrCode: React.FC<PaymentQrCodeProps> = ({
  value,
  size = 220,
  alt,
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

  if (error) {
    return <span role="alert">Lỗi tạo mã QR: {error}</span>;
  }
  if (!dataUrl) return <span aria-live="polite">Đang tạo mã QR…</span>;

  return <img src={dataUrl} alt={alt} width={size} height={size} />;
};
