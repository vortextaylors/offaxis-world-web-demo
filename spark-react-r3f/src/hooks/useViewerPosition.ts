import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export type ViewerPosition = { x: number; y: number; z: number };
export type NormalizedLandmark = { x: number; y: number; z: number };

const SCREEN_HALF_W = 3.5;
const SCREEN_HALF_H = SCREEN_HALF_W * (9 / 16);

const IRIS_CALIBRATION = 0.38;

const Z_MIN = 2;
const Z_MAX = 15;

const SENSITIVITY_X = 1.2;
const SENSITIVITY_Y = 1.0;

const SMOOTHING = 0.12;

const WASM_BASE = new URL(
  "../../node_modules/@mediapipe/tasks-vision/wasm",
  import.meta.url,
).href;

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const DEFAULT_Z = 5.0;

export function useViewerPosition() {
  const positionRef  = useRef<ViewerPosition>({ x: 0, y: 0, z: DEFAULT_Z });
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);

  useEffect(() => {
    let animFrameId: number;
    let landmarker: FaceLandmarker;

    const smoothed = { x: 0, y: 0, z: DEFAULT_Z };
    const target   = { x: 0, y: 0, z: DEFAULT_Z };

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);

      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: "GPU",
        },
        numFaces: 1,
        runningMode: "VIDEO",
      });

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();

      detect();
    }

    function detect() {
      if (video.readyState >= 2 && landmarker) {
        const result = landmarker.detectForVideo(video, performance.now());

        if (result.faceLandmarks.length > 0) {
          const lm = result.faceLandmarks[0];
          landmarksRef.current = lm;

          const lIris = lm[468];
          const rIris = lm[473];

          if (lIris && rIris) {
            const dx = lIris.x - rIris.x;
            const dy = lIris.y - rIris.y;
            const irisDistNorm = Math.sqrt(dx * dx + dy * dy);
            const rawZ =
              irisDistNorm > 0
                ? Math.min(Math.max(IRIS_CALIBRATION / irisDistNorm, Z_MIN), Z_MAX)
                : DEFAULT_Z;

            const cx = (lIris.x + rIris.x) / 2;
            const cy = (lIris.y + rIris.y) / 2;
            const rawX = (0.5 - cx) * SCREEN_HALF_W * 2 * SENSITIVITY_X;
            const rawY = (cy - 0.5) * SCREEN_HALF_H * 2 * SENSITIVITY_Y;

            target.x = rawX;
            target.y = rawY;
            target.z = rawZ;
          }
        } else {
          landmarksRef.current = null;
        }
      }

      smoothed.x += (target.x - smoothed.x) * SMOOTHING;
      smoothed.y += (target.y - smoothed.y) * SMOOTHING;
      smoothed.z += (target.z - smoothed.z) * SMOOTHING;
      positionRef.current = { ...smoothed };

      animFrameId = requestAnimationFrame(detect);
    }

    init().catch((err) => {
      console.error("[useViewerPosition] Failed to initialise MediaPipe:", err);
    });

    return () => {
      cancelAnimationFrame(animFrameId);
      if (video.srcObject) {
        for (const track of (video.srcObject as MediaStream).getTracks()) {
          track.stop();
        }
      }
      landmarker?.close();
      videoRef.current = null;
      landmarksRef.current = null;
    };
  }, []);

  return { positionRef, videoRef, landmarksRef };
}
