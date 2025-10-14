import { ArcRotateCamera, Vector3, Quaternion, Scene, Observer, PointerInfo, PointerEventTypes } from "babylonjs";

/**
 * CameraController handles dual POV (third-person and first-person) camera logic.
 * - Third-person: follows behind player, allows manual look, recenters after inactivity.
 * - First-person: camera at player eye, mouse controls view.
 *
 * Usage:
 *   - Call update() each frame with player position and facing.
 *   - Use getForward() for movement direction in Player.
 *   - Call togglePOV() to switch between first/third person.
 */
export class CameraController {
    private camera: ArcRotateCamera;
    private scene: Scene;
    private pov: "third" | "first" = "third";
    private followDistance = 8;
    private followHeight = 2.2;
    private recenterDelay = 2000; // ms
    private recenterLerp = 0.08;
    private lastManualInput = 0;
    private isDragging = false;
    private dragStartAlpha = 0;
    private dragStartBeta = 0;
    private pointerObserver?: Observer<PointerInfo>;

    constructor(camera: ArcRotateCamera, scene: Scene) {
        this.camera = camera;
        this.scene = scene;
        this.setupPointerControls();
    }

    /**
     * Call each frame to update camera position and orientation.
     * @param playerPos Player position
     * @param playerForward Player facing direction (Vector3)
     * @param deltaTime Frame time in seconds
     */
    update(playerPos: Vector3, playerForward: Vector3, deltaTime: number) {
        if (this.pov === "third") {
            // Desired camera position behind player
            const behind = playerForward.scale(-this.followDistance);
            const target = playerPos.add(new Vector3(0, this.followHeight, 0));
            const desiredPos = target.add(behind);

            // If not dragging and recenter needed, slerp alpha/beta to behind player
            if (!this.isDragging && Date.now() - this.lastManualInput > this.recenterDelay) {
                // Compute desired alpha/beta from playerForward
                const desiredAlpha = Math.atan2(playerForward.x, playerForward.z);
                const desiredBeta = Math.PI / 3;
                // Lerp alpha/beta
                this.camera.alpha += (desiredAlpha - this.camera.alpha) * this.recenterLerp;
                this.camera.beta += (desiredBeta - this.camera.beta) * this.recenterLerp;
            }

            // Lerp camera target to player
            this.camera.target = Vector3.Lerp(this.camera.target, target, 0.15);
            // Lerp camera radius to followDistance
            this.camera.radius += (this.followDistance - this.camera.radius) * 0.1;
        } else {
            // First-person: camera at player eye, matches player rotation
            const eye = playerPos.add(new Vector3(0, this.followHeight * 0.5, 0));
            this.camera.target = Vector3.Lerp(this.camera.target, eye, 0.3);
            this.camera.radius = 0.1;
        }
    }

    /**
     * Returns the camera's forward vector (XZ plane, normalized)
     */
    getForward(): Vector3 {
        if (this.pov === "first") {
            // Use camera's look direction
            const dir = this.camera.getTarget().subtract(this.camera.position);
            dir.y = 0;
            return dir.normalize();
        } else {
            // Use player facing direction (should be passed in)
            const alpha = this.camera.alpha;
            return new Vector3(Math.sin(alpha), 0, Math.cos(alpha)).normalize();
        }
    }

    /**
     * Returns the camera's right vector (XZ plane, normalized)
     */
    getRight(): Vector3 {
        const fwd = this.getForward();
        return new Vector3(-fwd.z, 0, fwd.x).normalize();
    }

    /**
     * Switch between first and third person
     */
    togglePOV() {
        this.pov = this.pov === "third" ? "first" : "third";
    }

    /**
     * Returns true if in first-person mode
     */
    isFirstPerson() {
        return this.pov === "first";
    }

    /**
     * Pointer/mouse controls for manual look and drag
     */
    private setupPointerControls() {
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 0 && this.pov === "third") {
                        this.isDragging = true;
                        this.dragStartAlpha = this.camera.alpha;
                        this.dragStartBeta = this.camera.beta;
                        this.lastManualInput = Date.now();
                    }
                    break;
                case PointerEventTypes.POINTERUP:
                    this.isDragging = false;
                    break;
                case PointerEventTypes.POINTERMOVE:
                    if (this.isDragging && this.pov === "third") {
                        const evt = pointerInfo.event as PointerEvent;
                        // Sensitivity can be tuned
                        this.camera.alpha = this.dragStartAlpha - evt.movementX * 0.01;
                        this.camera.beta = Math.max(0.1, Math.min(Math.PI - 0.1, this.dragStartBeta - evt.movementY * 0.01));
                        this.lastManualInput = Date.now();
                    }
                    break;
            }
        });
    }
}
