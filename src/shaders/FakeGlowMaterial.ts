/**
 * FakeGlow material by Anderson Mancini - Feb 2024.
 * Adapted for Void Saber (TypeScript).
 * Runs as a GLSL shader on the GPU — no post-processing needed.
 * Works in WebXR.
 */
import { ShaderMaterial, Uniform, Color, AdditiveBlending, DoubleSide, type Side } from 'three';

interface FakeGlowParams {
  falloff?: number;
  glowInternalRadius?: number;
  glowColor?: Color | string;
  glowSharpness?: number;
  opacity?: number;
  side?: Side;
  depthTest?: boolean;
}

class FakeGlowMaterial extends ShaderMaterial {
  constructor(parameters: FakeGlowParams = {}) {
    super();

    this.vertexShader = /* GLSL */ `
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * modelPosition;
        vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
        vPosition = modelPosition.xyz;
        vNormal = modelNormal.xyz;
      }
    `;

    this.fragmentShader = /* GLSL */ `
      uniform vec3 glowColor;
      uniform float falloffAmount;
      uniform float glowSharpness;
      uniform float glowInternalRadius;
      uniform float opacity;

      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vec3 normal = normalize(vNormal);
        if (!gl_FrontFacing)
          normal *= -1.0;
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = dot(viewDirection, normal);
        fresnel = pow(fresnel, glowInternalRadius + 0.1);
        float falloff = smoothstep(0., falloffAmount, fresnel);
        float fakeGlow = fresnel;
        fakeGlow += fresnel * glowSharpness;
        fakeGlow *= falloff;
        gl_FragColor = vec4(clamp(glowColor * fresnel, 0., 1.0), clamp(fakeGlow, 0., opacity));

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `;

    this.uniforms = {
      opacity: new Uniform(parameters.opacity ?? 1.0),
      glowInternalRadius: new Uniform(parameters.glowInternalRadius ?? 6.0),
      glowSharpness: new Uniform(parameters.glowSharpness ?? 0.5),
      falloffAmount: new Uniform(parameters.falloff ?? 0.1),
      glowColor: new Uniform(
        parameters.glowColor !== undefined
          ? (parameters.glowColor instanceof Color ? parameters.glowColor : new Color(parameters.glowColor))
          : new Color('#00d5ff')
      ),
    };

    this.depthTest = parameters.depthTest ?? false;
    this.blending = AdditiveBlending;
    this.transparent = true;
    this.side = parameters.side ?? DoubleSide;
  }
}

export default FakeGlowMaterial;
