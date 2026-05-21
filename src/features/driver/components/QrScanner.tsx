import { useEffect, useRef } from "react";

export function QrScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const elId = "qr-reader-region";
  const startedRef = useRef(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (decoded: string) => {
            onScan(decoded);
            scanner.stop().catch(() => {});
          },
          () => {},
        )
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear?.();
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
      <div id={elId} className="w-full max-w-sm overflow-hidden rounded-xl bg-black" />
      <button onClick={onClose} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold">
        Tutup
      </button>
    </div>
  );
}
