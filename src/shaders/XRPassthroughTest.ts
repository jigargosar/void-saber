/**
 * Minimal XR RenderTarget passthrough test — v3
 * 
 * Approach: Keep XR enabled throughout. Use viewport detection
 * in the composite shader to sample the correct eye from the RT.
 * 
 * Scene → RT (stereo, both eyes) → Composite quad (XR enabled, UV-corrected per eye)
 */
import * as THREE from 'three';

const VERT = /* GLSL */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// This shader detects which eye it's rendering via gl_FragCoord
// and samples the correct half of the stereo render target.
const FRAG = /* GLSL */ `
  uniform sampler2D tDiffuse;
  uniform vec4 viewport; // x, y, width, height of current viewport
  varying vec2 vUv;

  void main() {
    // Figure out where we are in the full framebuffer
    // gl_FragCoord is in framebuffer pixels
    // viewport.x tells us which eye (0 = left, >0 = right)
    
    // Normalize our position within the full framebuffer
    float fbX = gl_FragCoord.x;
    float totalWidth = viewport.z * 2.0; // assume two equal viewports
    
    // Our UV.x (0-1) maps to this viewport.
    // Remap to the correct half of the source texture.
    float texU;
    if (viewport.x < 1.0) {
      // Left eye: sample left half of texture (0.0 - 0.5)
      texU = vUv.x * 0.5;
    } else {
      // Right eye: sample right half of texture (0.5 - 1.0)
      texU = 0.5 + vUv.x * 0.5;
    }
    
    gl_FragColor = texture2D(tDiffuse, vec2(texU, vUv.y));
  }
`;

export class XRPassthroughTest {
  private renderer: THREE.WebGLRenderer;
  private mainScene: THREE.Scene;
  private mainCamera: THREE.Camera;
  private sceneRT: THREE.WebGLRenderTarget;

  // Composite scene — rendered WITH XR enabled
  private compScene: THREE.Scene;
  private compCamera: THREE.OrthographicCamera;
  private compMat: THREE.ShaderMaterial;
  private _logged = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.renderer = renderer;
    this.mainScene = scene;
    this.mainCamera = camera;

    const size = renderer.getSize(new THREE.Vector2());
    this.sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    // Composite setup
    this.compCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.compScene = new THREE.Scene();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));

    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        viewport: { value: new THREE.Vector4() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.compScene.add(new THREE.Mesh(geo, this.compMat));
  }

  render() {
    const r = this.renderer;

    // Step 1: Render scene into our RT (Three.js handles stereo)
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(this.mainScene, this.mainCamera);

    // Step 2: Composite back — XR stays enabled, shader picks correct eye
    // We need to update the viewport uniform before each eye renders.
    // Hook into Three.js's per-eye rendering via onBeforeRender on the mesh.
    const mesh = this.compScene.children[0] as THREE.Mesh;
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      // Get the current viewport — different for each eye
      const vp = new THREE.Vector4();
      _renderer.getCurrentViewport(vp);
      this.compMat.uniforms.viewport.value.copy(vp);
      
      if (!this._logged) {
        this._logged = true;
        console.log('DEBUG composite:', {
          viewport: { x: vp.x, y: vp.y, w: vp.z, h: vp.w },
          cameraType: camera.constructor.name,
          rtSize: { w: this.sceneRT.width, h: this.sceneRT.height },
        });
      }
    };

    this.compMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    r.setRenderTarget(null); // XR framebuffer
    r.clear();
    r.render(this.compScene, this.compCamera);
  }

  setSize(w: number, h: number) {
    this.sceneRT.setSize(w, h);
  }

  dispose() {
    this.sceneRT.dispose();
    this.compMat.dispose();
  }
}
