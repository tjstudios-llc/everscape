import { Scene, Mesh, MeshBuilder, StandardMaterial, Texture } from "babylonjs";

/**
 * Environment helper - creates ground, skybox, and holds references to environment meshes
 * Optimized for low-end hardware: fewer subdivisions, lower-res textures, and simple materials.
 */
export class Environment {
	public ground?: Mesh;
	public skybox?: Mesh;

	static async create(scene: Scene) {
		const env = new Environment();

		// Ground (height map) - reduce subdivisions for performance on low-end devices
		// subdivisions: lower -> cheaper tessellation
		env.ground = MeshBuilder.CreateGroundFromHeightMap(
			"ground",
			"https://assets.babylonjs.com/environments/villageheightmap.png",
			{ width: 200, height: 200, subdivisions: 64, minHeight: 0, maxHeight: 20 },
			scene
		);

		// Simple low-res material for ground (placeholder)
		const groundMat = new StandardMaterial("groundMat", scene);
		// Use a reasonable resolution texture (512px) from CDN
		groundMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/grass.jpg", scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
		env.ground.material = groundMat;

		// Skybox (low-res cube or single texture). Use a modest size and a lower-res texture.
		const skybox = MeshBuilder.CreateBox("skyBox", { size: 800.0 }, scene);
		const skyboxMat = new StandardMaterial("skyboxMat", scene);
		skyboxMat.backFaceCulling = false;
		skyboxMat.disableLighting = true;
		// Use a moderate resolution environment texture; we keep file size and resolution small for low-end
		skyboxMat.diffuseTexture = new Texture("https://assets.babylonjs.com/environments/sky.env", scene, false, true, Texture.BILINEAR_SAMPLINGMODE);
		skybox.material = skyboxMat;
		env.skybox = skybox;

		return env;
	}
}
