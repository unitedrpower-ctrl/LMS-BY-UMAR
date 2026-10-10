import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { User, Site } from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  HardHat, 
  Building2, 
  ShieldCheck, 
  IdCard,
  Sparkles
} from 'lucide-react';

interface WorkerQRCodeModalProps {
  worker: User;
  site?: Site;
  companyName?: string;
  onClose: () => void;
}

export const WorkerQRCodeModal: React.FC<WorkerQRCodeModalProps> = ({
  worker,
  site,
  companyName = 'BAWABBAT AL-WASIL',
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const badgeCardRef = useRef<HTMLDivElement>(null);

  // Structured QR payload containing worker identity and attendance authentication info
  const qrPayload = JSON.stringify({
    type: 'WORKER_ATTENDANCE_QR',
    version: '1.0',
    userId: worker.id,
    name: worker.name,
    role: worker.role,
    siteId: worker.siteId || site?.id || '',
    iqamaId: worker.iqamaId || '',
    companyId: worker.companyId || '',
    generatedAt: new Date().toISOString()
  });

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a', // Deep slate-900 for high optical contrast
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadBadge = () => {
    if (!qrDataUrl) return;

    // Create a canvas with high-res badge graphics
    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 900;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.25, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative top header
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, width, 12);

    // Header company name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(companyName.toUpperCase(), width / 2, 54);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('OFFICIAL WORKFORCE ATTENDANCE BADGE', width / 2, 80);

    // Card Inner White container
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 40, 110, 520, 740, 24);
    ctx.fill();

    // Worker details inside card
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(worker.name, width / 2, 170);

    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(
      `${worker.designation || worker.role.toUpperCase()} • ${site?.name || 'Central Operations'}`,
      width / 2,
      200
    );

    // Divider line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, 225);
    ctx.lineTo(530, 225);
    ctx.stroke();

    // QR Code Image
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    qrImage.onload = () => {
      ctx.drawImage(qrImage, 130, 250, 340, 340);

      // Info Fields
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';

      const leftX = 80;
      const rightX = 330;
      let y = 630;

      // Row 1
      ctx.fillText('WORKER ID:', leftX, y);
      ctx.fillText('IQAMA / ID:', rightX, y);
      y += 22;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(worker.id, leftX, y);
      ctx.fillText(worker.iqamaId || 'N/A', rightX, y);

      // Row 2
      y += 40;
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('DAILY WAGE RATE:', leftX, y);
      ctx.fillText('ISSUED DATE:', rightX, y);
      y += 22;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`SAR ${worker.dailyRate.toFixed(2)} / Day`, leftX, y);
      ctx.fillText(new Date().toISOString().split('T')[0], rightX, y);

      // Security footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Scan this badge at site checkpoints or mobile supervisor camera.',
        width / 2,
        810
      );

      // Trigger download
      const link = document.createElement('a');
      link.download = `${worker.name.replace(/\s+/g, '_')}_QR_Badge.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImage.src = qrDataUrl;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Worker Attendance QR Badge
              </h3>
              <p className="text-xs text-slate-400">
                بطاقة الحضور والإنصراف الذكية للعامل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Printable Badge */}
        <div className="p-6 space-y-6">
          {/* Printable Badge Container */}
          <div
            ref={badgeCardRef}
            className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden"
          >
            {/* Top Amber Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-indigo-500" />

            {/* Badge Top Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                  <HardHat className="w-4 h-4 font-bold" />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-wider text-amber-400 uppercase">
                    {companyName}
                  </div>
                  <div className="text-[10px] text-slate-400 tracking-wide">
                    WORKFORCE DIGITAL PASS
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>

            {/* Worker Identity Row */}
            <div className="mt-4 flex items-center gap-4">
              <UserAvatar
                src={worker.avatar}
                name={worker.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md flex-shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-lg font-black text-white truncate">
                  {worker.name}
                </h4>
                <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span>{worker.designation || worker.role}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 truncate">
                    {site?.name || 'Corporate HQ'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                  <span>ID: <strong className="text-slate-200">{worker.id}</strong></span>
                  {worker.iqamaId && (
                    <span>Iqama: <strong className="text-slate-200">{worker.iqamaId}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code Graphic Frame */}
            <div className="mt-5 bg-white rounded-2xl p-4 shadow-inner flex flex-col items-center justify-center">
              {isGenerating ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Generating QR Code...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative group flex flex-col items-center">
                  <img
                    src={qrDataUrl}
                    alt={`Attendance QR for ${worker.name}`}
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                  <div className="mt-2 text-center text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scan In / Scan Out with Mobile Camera</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-rose-500 py-8">
                  Failed to generate QR code
                </div>
              )}
            </div>

            {/* Bottom Meta Badges */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {site ? site.location : 'Head Office'}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                Rate: SAR {worker.dailyRate.toFixed(2)}/day
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={handleDownloadBadge}
              disabled={isGenerating || !qrDataUrl}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Card
            </button>

            <button
              onClick={handleCopyPayload}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy Token</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Instructions for Supervisor / Worker:</span>
              <p className="text-amber-700 mt-0.5">
                Workers can save this badge on their smartphone or keep a printed copy in their pocket. Site Supervisors can scan this QR code anytime from the <strong>Dashboard &gt; Scan QR</strong> button to record live Present or Half-Day attendance instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas helper to draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
