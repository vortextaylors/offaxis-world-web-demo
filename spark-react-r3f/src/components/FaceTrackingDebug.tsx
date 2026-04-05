import { useEffect, useRef } from "react";
import type { NormalizedLandmark, ViewerPosition } from "../hooks/useViewerPosition";

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10,
];

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarksRef: React.RefObject<NormalizedLandmark[] | null>;
  positionRef: React.RefObject<ViewerPosition>;
}

export function FaceTrackingDebug({ videoRef, landmarksRef, positionRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let rafId: number;

    function draw() {
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 240;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      const lm = landmarksRef.current;
      if (lm) {
        const w = canvas.width;
        const h = canvas.height;

        const px = (l: NormalizedLandmark) => (1 - l.x) * w;
        const py = (l: NormalizedLandmark) => l.y * h;

        ctx.beginPath();
        for (let i = 0; i < FACE_OVAL.length; i++) {
          const p = lm[FACE_OVAL[i]];
          if (!p) continue;
          if (i === 0) ctx.moveTo(px(p), py(p));
          else ctx.lineTo(px(p), py(p));
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(0, 255, 180, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const irisIndices = [468, 469, 470, 471, 472, 473, 474, 475, 476, 477];
        ctx.fillStyle = "rgba(0, 200, 255, 0.9)";
        for (const idx of irisIndices) {
          const p = lm[idx];
          if (!p) continue;
          ctx.beginPath();
          ctx.arc(px(p), py(p), 3, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const idx of [468, 473]) {
          const p = lm[idx];
          if (!p) continue;
          ctx.beginPath();
          ctx.arc(px(p), py(p), 6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 0, 0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [videoRef, landmarksRef]);

  const pos = positionRef.current;

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 select-none">
      <div className="relative overflow-hidden rounded-lg shadow-lg border border-white/20 w-48">
        <canvas ref={canvasRef} className="w-full block" />
        <div className="absolute top-1 left-1 text-[10px] text-white/70 font-mono bg-black/40 px-1 rounded">
          face cam
        </div>
        <LiveDot landmarksRef={landmarksRef} />
      </div>

      <PositionReadout positionRef={positionRef} />
    </div>
  );
}

function LiveDot({ landmarksRef }: { landmarksRef: React.RefObject<NormalizedLandmark[] | null> }) {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    function tick() {
      if (dotRef.current) {
        const tracking = landmarksRef.current !== null;
        dotRef.current.style.background = tracking ? "#22c55e" : "#ef4444";
      }
      rafId = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [landmarksRef]);

  return (
    <div
      ref={dotRef}
      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
      style={{ background: "#ef4444" }}
    />
  );
}

function PositionReadout({ positionRef }: { positionRef: React.RefObject<ViewerPosition> }) {
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  const zRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    function tick() {
      const { x, y, z } = positionRef.current;
      if (xRef.current) xRef.current.textContent = x.toFixed(2);
      if (yRef.current) yRef.current.textContent = y.toFixed(2);
      if (zRef.current) zRef.current.textContent = z.toFixed(2);
      rafId = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [positionRef]);

  return (
    <div className="font-mono text-xs bg-black/60 text-white/90 rounded-lg px-3 py-2 w-48 space-y-0.5 border border-white/10">
      <div className="text-white/40 text-[10px] mb-1">viewer position</div>
      <div className="flex justify-between">
        <span className="text-cyan-400">x</span>
        <span ref={xRef}>0.00</span>
      </div>
      <div className="flex justify-between">
        <span className="text-cyan-400">y</span>
        <span ref={yRef}>0.00</span>
      </div>
      <div className="flex justify-between">
        <span className="text-cyan-400">z</span>
        <span ref={zRef}>5.00</span>
      </div>
    </div>
  );
}
