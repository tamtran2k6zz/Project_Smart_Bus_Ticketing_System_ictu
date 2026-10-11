import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface TicketQrScannerProps {
  onDetected: (decodedText: string) => void;
  onClose?: () => void;
}

export default function TicketQrScanner({
  onDetected,
  onClose,
}: TicketQrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);

  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const scannerElementId = 'driver-qr-reader';
    const scanner = new Html5Qrcode(scannerElementId);

    scannerRef.current = scanner;
    detectedRef.current = false;

    const startScanner = async () => {
      try {
        setIsStarting(true);
        setError(null);

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (detectedRef.current) {
              return;
            }

            detectedRef.current = true;

            onDetectedRef.current(decodedText);

            try {
              if (scanner.isScanning) {
                await scanner.stop();
              }
            } catch {
              // Scanner có thể đã tự dừng.
            }

            try {
              await scanner.clear();
            } catch {
              // Bỏ qua lỗi cleanup.
            }

            onCloseRef.current?.();
          },
          () => {
            // Không cần hiển thị lỗi cho từng frame chưa tìm thấy QR.
          },
        );

        setIsStarting(false);
      } catch (err) {
        console.error('QR scanner error:', err);

        setIsStarting(false);
        setError(
          'Không thể mở camera. Hãy cấp quyền camera cho trình duyệt và thử lại.',
        );
      }
    };

    void startScanner();

    return () => {
      void (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          // Ignore cleanup errors.
        }

        try {
          await scanner.clear();
        } catch {
          // Ignore cleanup errors.
        }

        scannerRef.current = null;
      })();
    };
  }, []);

  const handleClose = async () => {
    const scanner = scannerRef.current;

    try {
      if (scanner?.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Ignore cleanup errors.
    }

    try {
      await scanner?.clear();
    } catch {
      // Ignore cleanup errors.
    }

    scannerRef.current = null;
    onClose?.();
  };

  return (
    <div className="driver-qr-scanner">
      <div className="driver-qr-scanner__header">
        <div>
          <strong>Quét mã QR vé</strong>
          <p>
            Đưa mã QR của hành khách vào chính giữa khung hình.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            className="driver-qr-scanner__close"
            onClick={() => void handleClose()}
          >
            Đóng
          </button>
        )}
      </div>

      <div className="driver-qr-scanner__viewport">
        <div id="driver-qr-reader" />
      </div>

      {isStarting && (
        <div className="driver-qr-scanner__message">
          Đang khởi động camera...
        </div>
      )}

      {error && (
        <div className="driver-qr-scanner__error">
          {error}
        </div>
      )}
    </div>
  );
}