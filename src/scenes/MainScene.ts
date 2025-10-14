import {
  Scene,
  Engine,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  SceneLoader,
  StandardMaterial,
  Texture,
  MeshBuilder,
  ShadowGenerator,
} from "babylonjs";
import { Environment } from "../core/Environment";
import { Player } from "../core/Player";
import { UI } from "../core/UI";

/**
 * MainScene - builds the 3D scene and implements the day/night cycle
 * - Uses a heightmap from a public CDN for the terrain
 * - Uses a simple skybox texture from a CDN (single texture used as placeholder)
 * - Day/night cycle maps system time to sun rotation and lighting/colors
 */
export class MainScene {
  static async create(scene: Scene, engine: Engine, canvas: HTMLCanvasElement) {
    // Camera: ArcRotate for orbiting and simple mouse control
    const camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 3, 60, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // Ambient hemisphere light
    const hemi = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;

    // Directional light will act as the sun
    const sun = new DirectionalLight("sun", new Vector3(0, -1, 0), scene);
    sun.intensity = 1.0;

    // Environment (ground & skybox)
    const env = await Environment.create(scene);

  // Player placeholder (pass camera so movement is camera-relative)
  const player = Player.create(scene, camera as ArcRotateCamera);

    // Simple shadows from sun (tuned for low-end hardware)
    // Use a low-res shadow map and avoid expensive ESM/PCF on low-end devices
    const cores = (navigator as any).hardwareConcurrency || 4;
    const mem = (navigator as any).deviceMemory || 4;
    let shadowMapSize = 1024;
    let useBlur = true;
    if (cores <= 2 || mem <= 2) {
      shadowMapSize = 512;
      useBlur = false;
    } else if (cores <= 4 || mem <= 4) {
      shadowMapSize = 768;
    }

    const shadowGen = new ShadowGenerator(shadowMapSize, sun);
    shadowGen.useBlurExponentialShadowMap = useBlur;
    shadowGen.addShadowCaster(player.mesh);
    if (env.ground) env.ground.receiveShadows = true;

    // UI placeholder
    UI.init();

    // Create a simple sky material using a texture
    // Using a single equirectangular image as a placeholder
    const skyMat = new StandardMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.disableLighting = true;
    skyMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/sky.env", scene);
    if (env.skybox) env.skybox.material = skyMat;

    // Day/night cycle state: compute target values from system time, but smoothly interpolate
    let currentSkyColor = new Color3(0.5, 0.7, 1.0);
    let currentSunIntensity = sun.intensity;
    let currentHemiIntensity = hemi.intensity;

    const computeTargets = () => {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      const t = (hours / 24) * Math.PI * 2;

      // Sun direction (immediate, but could be smoothed if desired)
      const sunDir = new Vector3(Math.cos(t), Math.sin(t), Math.sin(t * 0.5));
      const dayFactor = Math.max(0, Math.sin(t));

      // Sky target color
      let skyTarget: Color3;
      if (hours >= 6 && hours < 9) {
        const p = (hours - 6) / 3;
        skyTarget = Color3.Lerp(new Color3(0.6, 0.3, 0.2), new Color3(0.5, 0.7, 1.0), p);
      } else if (hours >= 9 && hours < 17) {
        skyTarget = new Color3(0.5, 0.7, 1.0);
      } else if (hours >= 17 && hours < 20) {
        const p = (hours - 17) / 3;
        skyTarget = Color3.Lerp(new Color3(0.5, 0.7, 1.0), new Color3(0.2, 0.05, 0.2), p);
      } else {
        skyTarget = new Color3(0.02, 0.02, 0.08);
      }

      const sunTarget = 0.2 + dayFactor * 1.2;
      const hemiTarget = 0.2 + dayFactor * 0.6;

      return { sunDir, skyTarget, sunTarget, hemiTarget };
    };

    // Smooth interpolation factor per frame (smaller = smoother)
    const lerpFactor = 0.02;

    // Register per-frame behavior: update player, day/night smoothing, and FPS
    let lastTime = performance.now();
    scene.registerBeforeRender(() => {
      const nowTime = performance.now();
      const deltaMs = nowTime - lastTime;
      lastTime = nowTime;
      const deltaSeconds = deltaMs / 1000;

      // Update player movement
      try {
        (player as any).update(deltaSeconds);
      } catch (e) {
        // ignore update errors in dev
      }

      // Compute targets and interpolate
      const targets = computeTargets();

      // Interpolate sky color
      currentSkyColor = Color3.Lerp(currentSkyColor, targets.skyTarget, lerpFactor);
      if (env.skybox && env.skybox.material && (env.skybox.material as StandardMaterial).diffuseColor) {
        (env.skybox.material as StandardMaterial).diffuseColor = currentSkyColor;
      }

      // Apply sun direction immediately (optional: could lerp vector)
      sun.direction = targets.sunDir.negate();

      // Interpolate intensities
      currentSunIntensity = currentSunIntensity + (targets.sunTarget - currentSunIntensity) * lerpFactor;
      currentHemiIntensity = currentHemiIntensity + (targets.hemiTarget - currentHemiIntensity) * lerpFactor;
      sun.intensity = currentSunIntensity;
      hemi.intensity = currentHemiIntensity;

      // Update FPS display
      UI.setFPS(engine.getFps());
    });

    // Make the scene responsive to window resizing via engine
    engine.resize();
  }
}

export default MainScene;
