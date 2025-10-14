import { Engine, Scene } from "babylonjs";
import { MainScene } from "../scenes/MainScene";

/**
 * Game - bootstraps the Babylon engine and the main scene
 * Optimizations included:
 * - Automatic hardware scaling based on devicePixelRatio and simple heuristics
 * - Frame rate capped to 60 FPS
 * - Rendering stops when the page is hidden to save CPU/GPU
 */
export class Game {
	private engine: Engine;
	private scene: Scene;
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		// Create engine with antialiasing: false on low-end devices could be considered
		this.engine = new Engine(this.canvas, true);
		this.scene = new Scene(this.engine);

		// Hardware scaling: reduce rendering resolution on high DPR or low-end devices
		const dpr = Math.max(1, window.devicePixelRatio || 1);
		const cores = (navigator as any).hardwareConcurrency || 4;
		const mem = (navigator as any).deviceMemory || 4;

		// Base scaling: if DPR > 1, use it to scale down. For low-end we increase scaling to reduce load.
		let scaling = dpr > 1 ? dpr : 1;
		if (cores <= 2 || mem <= 2) {
			scaling = Math.max(scaling, 1.5);
		} else if (cores <= 4 || mem <= 4) {
			scaling = Math.max(scaling, 1.25);
		}
		// Apply scaling (higher hardwareScalingLevel reduces rendering resolution)
		this.engine.setHardwareScalingLevel(scaling);
	}

	start() {
		// Initialize the main scene module
		// MainScene will perform further device-specific optimizations
		MainScene.create(this.scene, this.engine, this.canvas);

		// Cap FPS and pause rendering when the tab is hidden
		const targetFps = 60;
		const frameInterval = 1000 / targetFps;
		let running = true;
		let lastTime = performance.now();

		const loop = () => {
			if (!running) return;
			const now = performance.now();
			if (now - lastTime >= frameInterval) {
				try {
					this.scene.render();
				} catch (e) {
					// swallow render errors in dev
				}
				lastTime = now;
			}
			requestAnimationFrame(loop);
		};

		// Start the custom loop
		requestAnimationFrame(loop);

		// Stop rendering when the page is hidden (saves power on low-end devices)
		document.addEventListener("visibilitychange", () => {
			running = !document.hidden;
			if (running) {
				lastTime = performance.now();
				requestAnimationFrame(loop);
			}
		});
	}

	onResize() {
		this.engine.resize();
	}
}
