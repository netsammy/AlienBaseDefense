export const STAGES = {
  "lahore-outskirts": {
    label: "Lahore Outskirts",
    message: "Defend the truck-art base near the Lahore perimeter."
  },
  "food-street": {
    label: "Food Street Defense",
    message: "Aliens picked the wrong dinner rush."
  },
  "minar-zone": {
    label: "Minar Zone",
    message: "Hold the monument line."
  },
  "karachi-harbor": {
    label: "Karachi Harbor",
    message: "Defend the container yard while aliens rush in from the sea fog."
  },
  "islamabad-sector": {
    label: "Islamabad Sector",
    message: "Protect the clean sector base against a coordinated alien landing."
  },
  "peshawar-gate": {
    label: "Peshawar Gate",
    message: "Hold the old gate route before the swarm breaks through."
  }
};

export function setupStageSelect(context) {
  const { game, ui } = context;
  ui.stageButtons.forEach(button => {
    button.addEventListener("click", () => {
      game.selectedStage = button.dataset.stageId;
      ui.stageButtons.forEach(btn => btn.classList.toggle("selected", btn === button));
      ui.message.textContent = STAGES[game.selectedStage].message;
      context.refreshStageTheme?.();
    });
  });

  ui.stageButtons.forEach(button => {
    button.classList.toggle("selected", button.dataset.stageId === game.selectedStage);
  });
}
