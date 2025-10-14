import {
  Scene,
  MeshBuilder,
  Vector3,
  Ray,
  Mesh,
  StandardMaterial,
  Color3,
  Quaternion
} from "babylonjs";
import { CameraController } from "./CameraController";

/**
 * Player class
 * - Handles input (WASD + Space)
 * - Smooth acceleration/deceleration
 * - Gravity and simple ground collision via raycast
 * - Third-person follow camera (smooth) and first-person toggle (V)
 *
 * Optimization notes:
 * - Uses a simple box mesh as placeholder (cheap)
 * - Movement is purely kinematic (no full physics engine) to reduce overhead
 */
export class Player {
	public mesh!: Mesh;
	private scene!: Scene;
	private cameraController!: CameraController;
	private keys: Record<string, boolean> = {};

	// Movement state
	private velocity: Vector3 = new Vector3(0, 0, 0);
	private moveDirection: Vector3 = Vector3.Zero();
	private lastMoveDir: Vector3 = new Vector3(0, 0, 1); // Initial facing direction
	private walkSpeed = 5;  // Base walking speed
	private runSpeed = 8;   // Sprint speed when holding shift
	private accel = 30;     // Faster acceleration for responsive feel
	private decel = 40;     // Quick deceleration for tight control
	private jumpSpeed = 8;
	private gravity = -30;  // Stronger gravity for snappy jumps
	private halfHeight = 1;
	private rotationSpeed = 12;  // How quickly player rotates to face movement
	private minInputThreshold = 0.001; // Ignore tiny movements


		// Camera recentering and POV handled by CameraController
		private camHeight = 2.2;
		private lastToggle = 0; // debounce for view toggle

	private constructor() {
		// private; use static create()
	}

		static create(scene: Scene, cameraController: CameraController) {
			const p = new Player();
			p.scene = scene;
			p.cameraController = cameraController;

			// Create a cheap box as the player placeholder
			p.mesh = MeshBuilder.CreateBox("player_box", { size: 1.6 }, scene);
			p.halfHeight = 0.8;
			p.mesh.position = new Vector3(0, 6, 0);

			// Simple material to make player visible
			const mat = new StandardMaterial("playerMat", scene);
			mat.diffuseColor = new Color3(0.8, 0.2, 0.2);
			p.mesh.material = mat;

			// Keyboard handling: using DOM events for simplicity and lower overhead
			window.addEventListener("keydown", (e) => {
				const k = e.key.toLowerCase();
				p.keys[k] = true;
				// Toggle POV with 'v' (debounced)
				if (k === "v") {
					const now = performance.now();
					if (now - p.lastToggle > 250) {
						p.cameraController.togglePOV();
						p.lastToggle = now;
					}
				}
			});
			window.addEventListener("keyup", (e) => {
				p.keys[e.key.toLowerCase()] = false;
			});

			return p;
		}

		// Public update called by the main render loop
		update(deltaSeconds: number) {
			// 1) Get camera-relative movement vectors from CameraController
			const forward = (this.keys["w"] ? 1 : 0) - (this.keys["s"] ? 1 : 0);
			const right = (this.keys["d"] ? 1 : 0) - (this.keys["a"] ? 1 : 0);

			// Use CameraController for movement vectors
			const camForward = this.cameraController.getForward();
			const camRight = this.cameraController.getRight();
			const inputDir = camForward.scale(forward).add(camRight.scale(right));
			const inputLength = inputDir.length();

			// 2) Update movement direction and smooth rotation
			if (inputLength > this.minInputThreshold) {
				this.moveDirection = inputDir.scale(1 / inputLength);
				this.lastMoveDir = this.moveDirection.clone();

				// Smoothly rotate player mesh to face movement direction (only in third-person)
				if (!this.cameraController.isFirstPerson()) {
					const currentRotation = this.mesh.rotationQuaternion || Quaternion.RotationYawPitchRoll(this.mesh.rotation.y, 0, 0);
					const targetRotation = Quaternion.RotationYawPitchRoll(
						Math.atan2(this.moveDirection.x, this.moveDirection.z),
						0,
						0
					);
					const newRotation = Quaternion.Slerp(
						currentRotation,
						targetRotation,
						this.rotationSpeed * deltaSeconds
					);
					this.mesh.rotationQuaternion = newRotation;
				}
			} else {
				this.moveDirection = Vector3.Zero();
			}

			// 3) Calculate velocity with smooth acceleration
			const targetSpeed = inputLength > this.minInputThreshold ? (this.keys["shift"] ? this.runSpeed : this.walkSpeed) : 0;
			const currentHorizontalVel = new Vector3(this.velocity.x, 0, this.velocity.z);
			const currentSpeed = currentHorizontalVel.length();
			let newSpeed = currentSpeed;
			if (targetSpeed > currentSpeed) {
				newSpeed = Math.min(targetSpeed, currentSpeed + this.accel * deltaSeconds);
			} else if (targetSpeed < currentSpeed) {
				newSpeed = Math.max(targetSpeed, currentSpeed - this.decel * deltaSeconds);
			}

			// 4) Apply movement with collision detection
			if (this.moveDirection.length() > this.minInputThreshold) {
				const desiredVel = this.moveDirection.scale(newSpeed);
				if (this.mesh.moveWithCollisions) {
					const movement = new Vector3(
						desiredVel.x * deltaSeconds,
						this.velocity.y * deltaSeconds,
						desiredVel.z * deltaSeconds
					);
					this.mesh.moveWithCollisions(movement);
					this.velocity.x = desiredVel.x;
					this.velocity.z = desiredVel.z;
				} else {
					this.velocity.x = desiredVel.x;
					this.velocity.z = desiredVel.z;
				}
			} else {
				const decayFactor = Math.pow(0.1, deltaSeconds);
				this.velocity.x *= decayFactor;
				this.velocity.z *= decayFactor;
				if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
				if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
			}

		// 3) Ground detection via raycast
		const origin = this.mesh.position.add(new Vector3(0, 1.5, 0));
		const down = new Vector3(0, -1, 0);
		const ray = new Ray(origin, down, 3);
		const pick = this.scene.pickWithRay(ray, (m) => m !== this.mesh && m.name !== "skyBox");
		let groundY = -Infinity;
		if (pick && pick.hit && pick.pickedPoint) {
			groundY = pick.pickedPoint.y;
		}
		const onGround = groundY > -Infinity && Math.abs(this.mesh.position.y - (groundY + this.halfHeight)) < 0.05;

		// 4) Jumping (space)
		if ((this.keys[" "] || this.keys["space"]) && onGround) {
			this.velocity.y = this.jumpSpeed;
		}

		// 5) Gravity
		this.velocity.y += this.gravity * deltaSeconds;

		// 6) Integrate position
		const dx = new Vector3(this.velocity.x * deltaSeconds, this.velocity.y * deltaSeconds, this.velocity.z * deltaSeconds);
		this.mesh.position.addInPlace(dx);

		// Clamp player to terrain bounds (assuming terrain is centered at 0,0 and 200x200 as in Environment.ts)
		const terrainHalf = 100 - 1; // leave 1 unit margin
		this.mesh.position.x = Math.max(-terrainHalf, Math.min(terrainHalf, this.mesh.position.x));
		this.mesh.position.z = Math.max(-terrainHalf, Math.min(terrainHalf, this.mesh.position.z));

		// 7) Simple ground collision
		if (groundY > -Infinity && this.mesh.position.y - this.halfHeight < groundY) {
			this.mesh.position.y = groundY + this.halfHeight;
			this.velocity.y = 0;
		}

		// 8) Kill plane: reset player if they fall too far (e.g., off the map)
		if (this.mesh.position.y < -20) {
			this.mesh.position = new Vector3(0, 10, 0);
			this.velocity = new Vector3(0, 0, 0);
		}

			// 8) Camera logic: update camera each frame
			this.cameraController.update(
				this.mesh.position,
				this.lastMoveDir,
				deltaSeconds
			);
	}


	// Camera logic is now handled by CameraController
}

export default Player;
