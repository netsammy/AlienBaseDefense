import * as BABYLON from "@babylonjs/core";
import { getUI } from "./ui.js";
import { createGameScene } from "./scene.js";
import { setupInput } from "./input.js";
import { setupAudioUnlock } from "./sound.js";
import { setupAlienGallery } from "./alienGallery.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const ui = getUI();
const context = createGameScene({ canvas, engine, ui });
window.__alienBaseDefense = context;

setupAudioUnlock();
setupInput(context);
setupAlienGallery(context);

engine.runRenderLoop(() => {
  context.scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
