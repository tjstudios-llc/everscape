/*
 * Everscape Phase 1 bootstrap
 * - Creates the canvas and starts the game
 * - Loads the main scene module which builds the Babylon scene
 */

import { Game } from "./core/Game";

// Create and attach a full-page canvas
const canvas = document.createElement("canvas");
canvas.id = "gameCanvas";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
document.body.style.margin = "0";
document.body.appendChild(canvas);

// Initialize and start the game
const game = new Game(canvas);
game.start();

// Graceful resize handling
window.addEventListener("resize", () => game.onResize());

export {};
