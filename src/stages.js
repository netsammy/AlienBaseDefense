export const STAGES = {
  "lahore-outskirts": {
    label: "Lahore Outskirts",
    message: "Defend the truck-art base near the Lahore perimeter.",
    weather: "smog"
  },
  "food-street": {
    label: "Food Street Defense",
    message: "Aliens picked the wrong dinner rush.",
    weather: "smog"
  },
  "minar-zone": {
    label: "Minar Zone",
    message: "Hold the monument line.",
    weather: "snow"
  },
  "karachi-harbor": {
    label: "Karachi Harbor",
    message: "Defend the container yard while aliens rush in from the sea fog.",
    weather: "rain"
  },
  "islamabad-sector": {
    label: "Islamabad Sector",
    message: "Protect the clean sector base against a coordinated alien landing.",
    weather: "clear"
  },
  "peshawar-gate": {
    label: "Peshawar Gate",
    message: "Hold the old gate route before the swarm breaks through.",
    weather: "sandstorm"
  }
};

export const STAGE_KEYS = Object.keys(STAGES);

export function getNextStageKey(currentKey) {
  const index = STAGE_KEYS.indexOf(currentKey);
  if (index >= 0 && index + 1 < STAGE_KEYS.length) {
    return STAGE_KEYS[index + 1];
  }
  return null;
}

export function getStageNumber(key) {
  const index = STAGE_KEYS.indexOf(key);
  return index >= 0 ? index + 1 : 1;
}

export function selectStage(context, stageId) {
  const { game, ui } = context;
  if (!STAGES[stageId]) return;
  game.selectedStage = stageId;
  if (ui.stageButtons) {
    ui.stageButtons.forEach(btn => btn.classList.toggle("selected", btn.dataset.stageId === stageId));
  }
  if (ui.message) {
    ui.message.textContent = STAGES[stageId].message;
  }
  context.refreshStageTheme?.();
}

export function setupStageSelect(context) {
  const { game, ui } = context;
  ui.stageButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectStage(context, button.dataset.stageId);
      context.resetGame?.();
    });
  });

  ui.stageButtons.forEach(button => {
    button.classList.toggle("selected", button.dataset.stageId === game.selectedStage);
  });

  const campaignBtn = document.getElementById("campaignModeBtn");
  const endlessBtn = document.getElementById("endlessModeBtn");

  if (campaignBtn && endlessBtn) {
    campaignBtn.addEventListener("click", () => {
      game.isEndless = false;
      campaignBtn.classList.add("selected");
      endlessBtn.classList.remove("selected");
      if (ui.message) ui.message.textContent = "Campaign Mode active: Clear 6 cities to liberate the nation!";
    });

    endlessBtn.addEventListener("click", () => {
      game.isEndless = true;
      endlessBtn.classList.add("selected");
      campaignBtn.classList.remove("selected");
      if (ui.message) ui.message.textContent = `Endless Survival active: Infinite scaling swarms! Best: Wave ${game.endlessHighScore || 0}`;
    });
  }
}

