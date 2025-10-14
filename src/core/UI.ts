/**
 * UI placeholder - in Phase 1 we only create simple DOM placeholders
 * Phase 2 will replace this with an in-game HUD and menus
 */
export class UI {
	static init() {
		const hud = document.createElement("div");
		hud.id = "hud";
		hud.style.position = "absolute";
		hud.style.right = "10px";
		hud.style.top = "10px";
		hud.style.color = "white";
		hud.style.fontFamily = "sans-serif";
		hud.innerHTML = "<strong>Everscape</strong> - Phase 1";
		document.body.appendChild(hud);
    
		// FPS counter
		const fps = document.createElement("div");
		fps.id = "fps";
		fps.style.position = "absolute";
		fps.style.left = "10px";
		fps.style.top = "10px";
		fps.style.color = "white";
		fps.style.fontFamily = "monospace";
		fps.style.background = "rgba(0,0,0,0.3)";
		fps.style.padding = "4px 8px";
		fps.style.borderRadius = "4px";
		fps.innerText = "FPS: -";
		document.body.appendChild(fps);
	}

	static setFPS(value: number) {
		const el = document.getElementById("fps");
		if (el) el.innerText = `FPS: ${value.toFixed(0)}`;
	}
}
