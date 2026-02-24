/**
 * Custom XR-compatible bloom pipeline.
 * Bypasses EffectComposer entirely — uses raw RenderTargets + custom shaders.
 * Works in both desktop and WebXR modes.
 */
import * as THREE from 'three';

// ── Fullscreen triangle (more efficient than a quad) ──
function createFSTriangle(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  // A single oversized triangle that covers the entire screen
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return geo;
}

// ── Shader: Threshold (extract bright pixels) ──
const thresholdShader = {
  vertexShader: /* GLSL */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* GLSL */ `
    uniform sampler2D tDiffuse;
    uniform float threshold;
    uniform float softKnee;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      float knee = threshold * softKnee;
      float soft = brightness - threshold + knee;
      soft = clamp(soft, 0.0, 2.0 * knee);
      soft = soft * soft / (4.0 * knee + 0.0001);
      float contribution = max(soft, brightness - threshold) / max(brightness, 0.0001);
      gl_FragColor = color * max(contribution, 0.0);
    }
  `,
};

// ── Shader: Kawase Blur (lightweight, mobile-friendly) ──
const kawaseBlurShader = {
  vertexShader: /* GLSL */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* GLSL */ `
    uniform sampler2D tDiffuse;
    uniform vec2 texelSize;
    uniform float offset;
    varying vec2 vUv;

    void main() {
      vec4 sum = vec4(0.0);
      vec2 o = texelSize * (offset + 0.5);
      sum += texture2D(tDiffuse, vUv + vec2(-o.x, -o.y));
      sum += texture2D(tDiffuse, vUv + vec2(-o.x,  o.y));
      sum += texture2D(tDiffuse, vUv + vec2( o.x, -o.y));
      sum += texture2D(tDiffuse, vUv + vec2( o.x,  o.y));
      gl_FragColor = sum * 0.25;
    }
  `,
};

// ── Shader: Composite (add bloom to scene) ──
const compositeShader = {
  vertexShader: /* GLSL */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* GLSL */ `
    uniform sampler2D tScene;
    uniform sampler2D tBloom;
    uniform float bloomStrength;
    varying vec2 vUv;

    void main() {
      vec4 sceneColor = texture2D(tScene, vUv);
      vec4 bloomColor = texture2D(tBloom, vUv);
      gl_FragColor = sceneColor + bloomColor * bloomStrength;
    }
  `,
};

// ── Types ──
interface XRBloomOptions {
  strength?: number;
  threshold?: number;
  softKnee?: number;
  blurPasses?: number;
  resolution?: number; // multiplier for blur RT resolution (0.25 = quarter res)
}

export class XRBloom {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Render targets
  private sceneRT: THREE.WebGLRenderTarget;
  private brightRT: THREE.WebGLRenderTarget;
  private blurRT_A: THREE.WebGLRenderTarget;
  private blurRT_B: THREE.WebGLRenderTarget;

  // Post-processing scene (orthographic, not affected by XR)
  private ppScene: THREE.Scene;
  private ppCamera: THREE.OrthographicCamera;
  private fsMesh: THREE.Mesh;

  // Materials
  private thresholdMat: THREE.ShaderMaterial;
  private kawaseMat: THREE.ShaderMaterial;
  private compositeMat: THREE.ShaderMaterial;

  // Settings
  strength: number;
  threshold: number;
  blurPasses: number;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: XRBloomOptions = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.strength = options.strength ?? 0.6;
    this.threshold = options.threshold ?? 0.3;
    this.blurPasses = options.blurPasses ?? 5;

    const size = renderer.getSize(new THREE.Vector2());
    const resMult = options.resolution ?? 0.5;
    const blurW = Math.floor(size.x * resMult);
    const blurH = Math.floor(size.y * resMult);

    // Create render targets
    const rtParams: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType, // HDR for proper bloom
    };

    this.sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, rtParams);
    this.brightRT = new THREE.WebGLRenderTarget(blurW, blurH, rtParams);
    this.blurRT_A = new THREE.WebGLRenderTarget(blurW, blurH, rtParams);
    this.blurRT_B = new THREE.WebGLRenderTarget(blurW, blurH, rtParams);

    // Post-processing scene with ortho camera
    this.ppScene = new THREE.Scene();
    this.ppCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Fullscreen triangle mesh (we'll swap materials)
    const fsGeo = createFSTriangle();
    this.fsMesh = new THREE.Mesh(fsGeo);
    this.ppScene.add(this.fsMesh);

    // Materials
    this.thresholdMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: this.threshold },
        softKnee: { value: options.softKnee ?? 0.5 },
      },
      vertexShader: thresholdShader.vertexShader,
      fragmentShader: thresholdShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.kawaseMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        texelSize: { value: new THREE.Vector2(1 / blurW, 1 / blurH) },
        offset: { value: 0.0 },
      },
      vertexShader: kawaseBlurShader.vertexShader,
      fragmentShader: kawaseBlurShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        bloomStrength: { value: this.strength },
      },
      vertexShader: compositeShader.vertexShader,
      fragmentShader: compositeShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
  }

  render() {
    const renderer = this.renderer;
    const isXR = renderer.xr.isPresenting;

    // ── Step 1: Render scene to our render target ──
    renderer.setRenderTarget(this.sceneRT);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    // ── Steps 2-4: Post-processing passes ──
    // Temporarily disable XR so fullscreen quad renders aren't stereo
    if (isXR) {
      renderer.xr.enabled = false;
    }

    // ── Step 2: Threshold — extract bright pixels ──
    this.thresholdMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    this.thresholdMat.uniforms.threshold.value = this.threshold;
    this.fsMesh.material = this.thresholdMat;
    renderer.setRenderTarget(this.brightRT);
    renderer.clear();
    renderer.render(this.ppScene, this.ppCamera);

    // ── Step 3: Kawase blur (ping-pong) ──
    let readRT = this.brightRT;
    let writeRT = this.blurRT_A;

    for (let i = 0; i < this.blurPasses; i++) {
      this.kawaseMat.uniforms.tDiffuse.value = readRT.texture;
      this.kawaseMat.uniforms.offset.value = i;
      this.fsMesh.material = this.kawaseMat;
      renderer.setRenderTarget(writeRT);
      renderer.clear();
      renderer.render(this.ppScene, this.ppCamera);

      // Swap
      const temp = readRT;
      readRT = writeRT;
      writeRT = (temp === this.blurRT_A) ? this.blurRT_B : this.blurRT_A;
    }

    // ── Step 4: Composite — blend scene + bloom → output ──
    this.compositeMat.uniforms.tScene.value = this.sceneRT.texture;
    this.compositeMat.uniforms.tBloom.value = readRT.texture;
    this.compositeMat.uniforms.bloomStrength.value = this.strength;
    this.fsMesh.material = this.compositeMat;
    renderer.setRenderTarget(null); // Output to screen / XR framebuffer
    renderer.clear();
    renderer.render(this.ppScene, this.ppCamera);

    // Re-enable XR
    if (isXR) {
      renderer.xr.enabled = true;
    }
  }

  setSize(width: number, height: number) {
    this.sceneRT.setSize(width, height);
    const blurW = Math.floor(width * 0.5);
    const blurH = Math.floor(height * 0.5);
    this.brightRT.setSize(blurW, blurH);
    this.blurRT_A.setSize(blurW, blurH);
    this.blurRT_B.setSize(blurW, blurH);
    this.kawaseMat.uniforms.texelSize.value.set(1 / blurW, 1 / blurH);
  }

  dispose() {
    this.sceneRT.dispose();
    this.brightRT.dispose();
    this.blurRT_A.dispose();
    this.blurRT_B.dispose();
    this.thresholdMat.dispose();
    this.kawaseMat.dispose();
    this.compositeMat.dispose();
    this.fsMesh.geometry.dispose();
  }
}
