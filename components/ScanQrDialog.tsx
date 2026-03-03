import React, { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import QrScannerWorkerPath from "qr-scanner/qr-scanner-worker.min.js?url";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

QrScanner.WORKER_PATH = QrScannerWorkerPath;

export type ScanDetectionResult =
  | { ok: true }
  | { ok: false; message: string };

interface ScanQrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (value: string) => Promise<ScanDetectionResult> | ScanDetectionResult;
}

export const ScanQrDialog: React.FC<ScanQrDialogProps> = ({ isOpen, onClose, onDetected }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const detectingRef = useRef(false);
  const [status, setStatus] = useState("Point the camera at the QR code.");
  const [error, setError] = useState("");
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    detectingRef.current = false;
    setError("");
    setStatus("Requesting camera...");

    let active = true;
    const handleDetectedValue = async (value: string) => {
      if (!active || detectingRef.current) return;
      detectingRef.current = true;
      setError("");
      setStatus("Checking card...");

      try {
        const result = await onDetected(value);
        if (!active) return;
        if (!result.ok) {
          setError(result.message);
          setStatus("Scanning...");
          detectingRef.current = false;
          return;
        }
        onClose();
      } catch {
        if (!active) return;
        setError("Unable to validate this card right now.");
        setStatus("Scanning...");
        detectingRef.current = false;
      }
    };

    const startScanner = async () => {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setError("No camera detected on this device.");
        return;
      }
      if (!videoRef.current) return;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          void handleDetectedValue(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      scannerRef.current = scanner;
      await scanner.start();
      if (!active) return;
      setStatus("Scanning...");
    };

    startScanner().catch(() => {
      setError("Camera access blocked. Please allow camera permissions.");
    });

    return () => {
      active = false;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [isOpen, onDetected, onClose]);

  const handleManualSubmit = async () => {
    if (!manualValue.trim() || detectingRef.current) return;
    detectingRef.current = true;
    setError("");
    setStatus("Checking card...");

    try {
      const result = await onDetected(manualValue.trim());
      if (!result.ok) {
        setError(result.message);
        setStatus("Scanning...");
        detectingRef.current = false;
        return;
      }
      onClose();
    } catch {
      setError("Unable to validate this card right now.");
      setStatus("Scanning...");
      detectingRef.current = false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-4">
          <div className="rounded-2xl border bg-black/90 overflow-hidden relative">
            <video ref={videoRef} className="w-full h-64 object-cover" />
            <div className="absolute inset-0 pointer-events-none border-2 border-white/30 rounded-2xl m-4" />
          </div>
          <div className="text-xs text-muted-foreground">{status}</div>
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="rounded-2xl border bg-muted/30 p-4 space-y-2">
            <Label>Enter card ID manually</Label>
            <div className="flex items-center gap-2">
              <Input
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="Paste card ID"
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={handleManualSubmit}>
                Open
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
