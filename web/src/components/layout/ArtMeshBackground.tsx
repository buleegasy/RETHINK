import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector2 } from 'three';
import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  
  // Create an organic flowing motion
  float elevation = sin(position.x * 1.5 + uTime * 0.3) * 
                    sin(position.y * 1.5 + uTime * 0.3) * 1.5;
                    
  // Add secondary waves
  elevation += sin(position.x * 3.0 - uTime * 0.5) * 0.5;
  elevation += sin(position.y * 2.0 - uTime * 0.4) * 0.5;
  
  // Mouse interaction: gentle push away
  float dist = distance(position.xy, uMouse * 4.0);
  float influence = smoothstep(3.0, 0.0, dist);
  elevation -= influence * 2.0;

  vElevation = elevation;
  
  vec3 newPosition = position;
  newPosition.z += elevation;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
varying vec2 vUv;
varying float vElevation;

// Colors mapping to light/warm/safe aesthetics
vec3 color1 = vec3(1.0, 0.96, 0.90); // Warm off-white
vec3 color2 = vec3(1.0, 0.90, 0.70); // Gentle sun yellow
vec3 color3 = vec3(1.0, 0.85, 0.85); // Very soft peach
vec3 color4 = vec3(0.95, 0.88, 0.80); // Oat/sand

void main() {
  // Base mix based on UVs and time
  float mix1 = sin(vUv.x * 3.0 + uTime * 0.2) * 0.5 + 0.5;
  float mix2 = cos(vUv.y * 2.0 - uTime * 0.1) * 0.5 + 0.5;
  
  // Modify mix based on elevation to highlight peaks and valleys
  float elevationMix = (vElevation + 2.5) / 5.0;
  
  vec3 baseColor = mix(color1, color2, mix1);
  vec3 accentColor = mix(color3, color4, mix2);
  
  vec3 finalColor = mix(baseColor, accentColor, elevationMix);
  
  // Add a very subtle grain/noise for an "art installation" physical texture
  float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
  finalColor -= noise * 0.02;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const BreathingMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, pointer } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new Vector2(0, 0) },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Smoothly interpolate mouse position
      materialRef.current.uniforms.uMouse.value.x = MathUtils.lerp(
        materialRef.current.uniforms.uMouse.value.x,
        pointer.x * (viewport.width / 2),
        0.05
      );
      materialRef.current.uniforms.uMouse.value.y = MathUtils.lerp(
        materialRef.current.uniforms.uMouse.value.y,
        pointer.y * (viewport.height / 2),
        0.05
      );
    }
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      {/* High-res plane to show smooth displacement */}
      <planeGeometry args={[1.5, 1.5, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        wireframe={false}
      />
    </mesh>
  );
};

export function ArtMeshBackground() {
  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none" style={{ background: '#FFFDF5' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]} // Support retina displays beautifully
        gl={{ antialias: true, alpha: false }} // alpha false for better performance when we completely cover the screen
      >
        <BreathingMesh />
      </Canvas>
    </div>
  );
}
