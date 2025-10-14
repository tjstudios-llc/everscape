import { Scene, MeshBuilder, Vector3, ArcRotateCamera, Ray } from "babylonjs";

/**
 * Player with basic movement (WASD) and jumping.
 * - Movement is relative to the camera's orientation (ArcRotateCamera).
 * - Simple ground detection via raycast against the scene.
 * - Exposes update(deltaSeconds) to be called every frame.
 */
export class Player {
	public mesh: any;
		private scene!: Scene;
		private camera!: ArcRotateCamera;
	private keys: Record<string, boolean> = {};
	private velocity: Vector3 = new Vector3(0, 0, 0);
	private speed = 15; // units per second
	private jumpSpeed = 8;
	private gravity = -24; // stronger gravity for snappier feel
	private halfHeight = 1;

	static create(scene: Scene, camera: ArcRotateCamera) {
		const player = new Player();
		player.scene = scene;
		player.camera = camera;

		// Simple player representation: a box for now
		player.mesh = MeshBuilder.CreateBox("playerBox", { size: 2 }, scene);
		player.halfHeight = 1;
		player.mesh.position = new Vector3(0, 10, 0);

		// Keyboard handling via scene observable
		scene.onKeyboardObservable.add((kbInfo) => {
			const evt = kbInfo.event as KeyboardEvent;
			const key = evt.key.toLowerCase();
			if (kbInfo.type === 1) {
				// keydown
				player.keys[key] = true;
			} else if (kbInfo.type === 2) {
				// keyup
				player.keys[key] = false;
			}
		});

		return player;
	}

	// Update movement; deltaSeconds is seconds since last frame
	update(deltaSeconds: number) {
		// Movement input (WASD)
		const forward = (this.keys["w"] ? 1 : 0) - (this.keys["s"] ? 1 : 0);
		const right = (this.keys["d"] ? 1 : 0) - (this.keys["a"] ? 1 : 0);

		// Build movement vector relative to camera alpha (y-rotation)
		const alpha = this.camera.alpha;
		const fwdVec = new Vector3(Math.sin(alpha), 0, Math.cos(alpha));
		const rightVec = new Vector3(Math.sin(alpha + Math.PI / 2), 0, Math.cos(alpha + Math.PI / 2));

		const move = fwdVec.scale(forward).add(rightVec.scale(right));
		if (move.length() > 0.0001) {
			move.normalize();
			const desired = move.scale(this.speed * deltaSeconds);
			this.mesh.position.addInPlace(desired);
		}

		// Ground detection via raycast downwards
		// Important: exclude the player's own mesh (and skybox) from hits so the ray doesn't pick the player
		const origin = this.mesh.position.add(new Vector3(0, 8, 0));
		const direction = new Vector3(0, -1, 0);
		const ray = new Ray(origin, direction, 150);
		const pick = this.scene.pickWithRay(ray, (m) => m !== this.mesh && m.name !== "skyBox");
		let groundY = -Infinity;
		if (pick && pick.hit && pick.pickedPoint) {
			groundY = pick.pickedPoint.y;
		}

		// Jumping
		const onGround = this.mesh.position.y - this.halfHeight <= groundY + 0.05;
		if (this.keys[" "] || this.keys["space"]) {
			// Only allow jump if on ground
			if (onGround && Math.abs(this.velocity.y) < 0.1) {
				this.velocity.y = this.jumpSpeed;
			}
		}

		// Gravity integration
		this.velocity.y += this.gravity * deltaSeconds;
		this.mesh.position.y += this.velocity.y * deltaSeconds;

		// Simple collision with ground
		if (groundY !== -Infinity && this.mesh.position.y - this.halfHeight < groundY) {
			this.mesh.position.y = groundY + this.halfHeight;
			this.velocity.y = 0;
		}

		// Keep the camera target roughly at the player
		try {
			this.camera.target = this.mesh.position;
		} catch (e) {
			// ignore if camera can't be set
		}
	}
}

export default Player;
