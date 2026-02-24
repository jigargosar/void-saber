import * as THREE from 'three';

// Glow shell shader — renders a larger transparent halo around any mesh
// Works in XR because it's just a material, no post-processing

const glowVertexShader = `
  uniform float glowScale;
  varying float vIntensity;

  void main() {
    // Push vertices outward along normals
    vec3 expanded = position + normal * glowScale;
    vec4 mvPosition = modelViewMatrix * vec4(expanded, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Intensity falls off from center — use normal dot view direction
    vec3 viewDir = normalize(-mvPosition.xyz);
    vec3 worldNormal = normalize(normalMatrix * normal);
    vIntensity = pow(1.0 - abs(dot(worldNormal, viewDir)), 1.5);
  }
`;

const glowFragmentShader = `
  uniform vec3 glowColor;
  uniform float glowOpacity;
  varying float vIntensity;

  void main() {
    float alpha = vIntensity * glowOpacity;
    gl_FragColor = vec4(glowColor, alpha);
  }
`;

export function createGlowMaterial(color: THREE.Color, scale = 0.3, opacity = 0.4): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: color },
      glowScale: { value: scale },
      glowOpacity: { value: opacity },
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
