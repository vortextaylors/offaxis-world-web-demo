import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { SplatMesh } from "./components/spark/SplatMesh";
import { SparkRenderer } from "./components/spark/SparkRenderer";
import { useMemo, useRef } from "react";
import type { SplatMesh as SparkSplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";
import { useViewerPosition, type ViewerPosition } from "./hooks/useViewerPosition";
import { FaceTrackingDebug } from "./components/FaceTrackingDebug";

const SCREEN_W = 3.5;
const SCREEN_H = SCREEN_W * (9 / 16);

function App() {
  const { positionRef, videoRef, landmarksRef } = useViewerPosition();

  return (
    <div className="relative flex h-screen w-screen">
      <Canvas gl={{ antialias: false }}>
        <Scene viewerPos={positionRef} />
      </Canvas>

      <FaceTrackingDebug
        videoRef={videoRef}
        landmarksRef={landmarksRef}
        positionRef={positionRef}
      />
    </div>
  );
}

function OffAxisCamera({ viewerPos }: { viewerPos: React.RefObject<ViewerPosition> }) {
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);

  useFrame(() => {
    const { x, y, z } = viewerPos.current;
    const near = camera.near;
    const far = camera.far;

    const left   = (near / z) * (-SCREEN_W - x);
    const right  = (near / z) * ( SCREEN_W - x);
    const top    = (near / z) * ( SCREEN_H - y);
    const bottom = (near / z) * (-SCREEN_H - y);

    camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    camera.position.set(x, y, z);
    camera.updateMatrixWorld();
  });

  return null;
}

const Scene = ({ viewerPos }: { viewerPos: React.RefObject<ViewerPosition> }) => {
  const renderer = useThree((state) => state.gl);
  const meshRef = useRef<SparkSplatMesh>(null);

  const sparkRendererArgs = useMemo(() => ({ renderer }), [renderer]);

  const splatMeshArgs = useMemo(
    () =>
      ({
        url: "/assets/splats/fireplace.spz",
      }) as const,
    [],
  );

  return (
    <>
      <OffAxisCamera viewerPos={viewerPos} />
      <SparkRenderer args={[sparkRendererArgs]}>
        <group rotation={[Math.PI, 0, 0]}>
          <SplatMesh ref={meshRef} args={[splatMeshArgs]} />
        </group>
      </SparkRenderer>
    </>
  );
};

export default App;
