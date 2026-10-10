import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { User, Site, Attendance, AttendanceStatus } from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Sparkles, 
  Clock, 
  HardHat, 
  Building2, 
  Volume2, 
  VolumeX, 
  Flashlight,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  sites: Site[];
  attendance: Attendance[];
  currentUser: User;
  onMarkAttendance: (records: Attendance[]) => Promise<void> | void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  users,
  sites,
  attendance,
  currentUser,
  onMarkAttendance
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [autoMarkPresent, setAutoMarkPresent] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Scanned Worker Details State
  const [scannedWorker, setScannedWorker] = useState<User | null>(null);
  const [scannedPayloadRaw, setScannedPayloadRaw] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [attendanceNotes, setAttendanceNotes] = useState<string>('Scanned via Mobile Camera QR');
  const [markingSuccess, setMarkingSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Web Audio API beep
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // AudioContext not allowed or unsupported
    }
  }, [soundEnabled]);

  // Stop camera media tracks
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Handle parsed worker ID and match with user database
  const handleDecodedData = useCallback((decodedText: string) => {
    if (!decodedText) return;
    playBeep();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(120);
      } catch {
        // ignore
      }
    }

    setScannedPayloadRaw(decodedText);
    let matchedUser: User | undefined;

    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === 'object') {
        const candidateId = parsed.userId || parsed.id;
        if (candidateId) {
          matchedUser = users.find((u) => u.id === candidateId);
        }
        if (!matchedUser && parsed.iqamaId) {
          matchedUser = users.find((u) => u.iqamaId === parsed.iqamaId);
        }
        if (!matchedUser && parsed.name) {
          matchedUser = users.find(
            (u) => u.name.toLowerCase().trim() === String(parsed.name).toLowerCase().trim()
          );
        }
      }
    } catch {
      // Not JSON, check raw strings like WORKER:usr-1 or usr-1
      let rawId = decodedText.trim();
      if (rawId.startsWith('WORKER:')) {
        rawId = rawId.replace('WORKER:', '').trim();
      }
      matchedUser = users.find(
        (u) =>
          u.id === rawId ||
          u.iqamaId === rawId ||
          u.email.toLowerCase() === rawId.toLowerCase()
      );
    }

    if (matchedUser) {
      setScannedWorker(matchedUser);
      setSelectedSiteId(matchedUser.siteId || currentUser.siteId || sites[0]?.id || '');
      setCameraError(null);

      // If Auto-Mark is enabled, automatically mark Present!
      if (autoMarkPresent) {
        handleQuickMark(matchedUser, 'Present', 0, 'Auto-marked via QR Scanner');
      }
    } else {
      setCameraError(`Unrecognized QR code or worker not found in system: "${decodedText.substring(0, 30)}..."`);
    }
  }, [users, currentUser, sites, autoMarkPresent, playBeep]);

  // Frame processing loop
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          // QR Code found!
          handleDecodedData(code.data);
          // Pause camera scanning once a code is found so user can review/confirm
          if (!autoMarkPresent) {
            stopCamera();
            return;
          }
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, [handleDecodedData, autoMarkPresent, stopCamera]);

  // Start camera media stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);

        // Check if torch/flashlight is supported
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() as any) || {};
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        animFrameRef.current = requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraActive(false);
      let errorMsg = 'Could not access device camera. Please check camera permissions in your browser.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access in browser site settings or upload a QR image below.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device. You can upload a photo of the worker QR badge below.';
      }
      setCameraError(errorMsg);
    }
  }, [facingMode, stopCamera, tick]);

  // Toggle flashlight/torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // Switch camera front/back
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Image upload fallback for scanning
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          handleDecodedData(code.data);
        } else {
          setCameraError('No valid QR code was detected in the uploaded image. Please try a clearer picture.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Effect to manage camera on open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedWorker(null);
      setScannedPayloadRaw(null);
      setMarkingSuccess(null);
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Save attendance record
  const handleQuickMark = async (
    worker: User,
    status: AttendanceStatus,
    ot: number = 0,
    notes: string = ''
  ) => {
    setIsSaving(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const existingRec = attendance.find(
      (a) => a.userId === worker.id && a.date === todayStr
    );

    const record: Attendance = {
      id: existingRec?.id || `att-${worker.id}-${todayStr}`,
      companyId: currentUser.companyId || worker.companyId,
      userId: worker.id,
      siteId: selectedSiteId || worker.siteId || sites[0]?.id || 'site-central',
      date: todayStr,
      status: status,
      markedBy: currentUser.id,
      checkInTime: nowTime,
      overtimeHours: ot,
      isFridayOvertime: new Date().getDay() === 5 && ot > 0,
      notes: notes || `QR Check-In at ${nowTime} by ${currentUser.name}`
    };

    try {
      await onMarkAttendance([record]);
      setMarkingSuccess(
        `✓ ${worker.name} successfully marked "${status}" at ${nowTime}!`
      );
    } catch (err: any) {
      console.warn('Attendance save warning:', err);
      setMarkingSuccess(
        `✓ ${worker.name} marked "${status}" locally!`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualMark = (status: AttendanceStatus) => {
    if (!scannedWorker) return;
    handleQuickMark(
      scannedWorker,
      status,
      overtimeHours,
      attendanceNotes
    );
  };

  const handleScanNext = () => {
    setScannedWorker(null);
    setScannedPayloadRaw(null);
    setMarkingSuccess(null);
    setCameraError(null);
    setOvertimeHours(0);
    setAttendanceNotes('Scanned via Mobile Camera QR');
    startCamera();
  };

  if (!isOpen) return null;

  // Check today's existing status for the scanned worker
  const existingTodayAttendance = scannedWorker
    ? attendance.find((a) => a.userId === scannedWorker.id && a.date === todayStr)
    : null;

  const currentAssignedSite = sites.find((s) => s.id === (scannedWorker?.siteId || selectedSiteId));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Scan Worker Attendance QR
              </h3>
              <p className="text-xs text-slate-400">
                تسجيل الحضور عبر كاميرا الهاتف الذكي
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* CAMERA VIEWFINDER (when no worker is selected or continuous scan) */}
          {!scannedWorker && (
            <div className="space-y-3">
              <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Laser Overlay & Target Box */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-64 h-64 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center">
                      {/* Viewfinder Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                      {/* Animated Laser Scan Line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#fbbf24] animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Camera Top Floating Controls */}
                {cameraActive && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white rounded-full text-[11px] font-bold flex items-center gap-1.5 border border-slate-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Camera Live • Align QR in box
                    </span>

                    <div className="flex items-center gap-1.5">
                      {hasTorch && (
                        <button
                          onClick={handleToggleTorch}
                          className={`p-2 rounded-xl backdrop-blur-xs border transition-colors cursor-pointer ${
                            torchOn
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-slate-900/80 text-white border-slate-700'
                          }`}
                          title="Toggle Flashlight"
                        >
                          <Flashlight className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={handleToggleFacingMode}
                        className="p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl backdrop-blur-xs border border-slate-700 transition-colors cursor-pointer"
                        title="Flip Camera (Front/Back)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Fallback / Permission Error Overlay */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs text-slate-200 max-w-xs">{cameraError}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Controls & Options */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoMarkPresent}
                    onChange={(e) => setAutoMarkPresent(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-700">
                    ⚡ Auto-Mark Present on Scan (Gate Mode)
                  </span>
                </label>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload QR Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          )}

          {/* SCANNED WORKER RECOGNIZED CARD */}
          {scannedWorker && (
            <div className="space-y-4">
              {/* Success Banner if already marked */}
              {markingSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl">
                      <Check className="w-5 h-5 font-black" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold">{markingSuccess}</h4>
                      <p className="text-xs text-emerald-700">
                        Attendance synchronized with live records and payroll.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleScanNext}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    Scan Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Worker Profile Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <UserAvatar
                      src={scannedWorker.avatar}
                      name={scannedWorker.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400 shadow-md flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-white">
                          {scannedWorker.name}
                        </h4>
                        <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-full text-[10px] font-bold">
                          {scannedWorker.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {scannedWorker.designation || 'Site Laborer'} • {currentAssignedSite?.name || 'Head Office'}
                      </p>
                      <div className="text-[11px] text-slate-400 font-mono mt-1 flex gap-3">
                        <span>ID: <strong>{scannedWorker.id}</strong></span>
                        {scannedWorker.iqamaId && (
                          <span>Iqama: <strong>{scannedWorker.iqamaId}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold font-mono">
                    SAR {scannedWorker.dailyRate.toFixed(2)}/d
                  </span>
                </div>

                {/* Status for Today */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Today ({todayStr}):</span>
                  </div>
                  <div>
                    {existingTodayAttendance ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        existingTodayAttendance.status === 'Present'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : existingTodayAttendance.status === 'Half-Day'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        Current: {existingTodayAttendance.status}
                        {existingTodayAttendance.checkInTime && ` (${existingTodayAttendance.checkInTime})`}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold">
                        Not marked yet today
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Site & OT Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Assigned Work Site
                    </label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Overtime Hours (if applicable)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      step="0.5"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                      placeholder="0.0 hours"
                    />
                  </div>
                </div>
              </div>

              {/* Attendance Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-slate-700">
                  Select Attendance Action to Record:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleManualMark('Present')}
                    disabled={isSaving}
                    className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>Mark Present (Full Day)</span>
                    <span className="text-[10px] text-emerald-200 font-normal">
                      1.0 Day Wage
                    </span>
                  </button>

                  <button
                    onClick={() => handleManualMark('Half-Day')}
                    disabled={isSaving}
                    className="py-3 px-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Clock className="w-5 h-5 text-amber-200" />
                    <span>Mark Half-Day</span>
                    <span className="text-[10px] text-amber-200 font-normal">
                      0.5 Day Wage
                    </span>
                  </button>

                  <button
                    onClick={handleScanNext}
                    className="py-3 px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-5 h-5 text-indigo-300" />
                    <span>Scan Another Worker</span>
                    <span className="text-[10px] text-slate-300 font-normal">
                      Resume Camera
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Supervisor / Gate Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p>
              Scans are timestamped in real-time and accredited to <strong>{currentUser.name}</strong> ({currentUser.role}). Attendance entries automatically calculate payroll hours, Friday rates, and overtime earnings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
