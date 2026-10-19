import { saveGame } from "./saveSystem.js";
import { updateUI } from "./ui.js";

export const STAGES = {
  "lahore-outskirts": {
    label: "Lahore Outskirts",
    message: "Defend the truck-art base under the bright Lahore sky.",
    weather: "clear",
    city: "Lahore"
  },
  "food-street": {
    label: "Food Street Defense",
    message: "Aliens picked the wrong dinner rush in historic Old Lahore.",
    weather: "clear",
    city: "Lahore"
  },
  "minar-zone": {
    label: "Minar Zone",
    message: "Hold the national monument line in broad daylight.",
    weather: "clear",
    city: "Lahore"
  },
  "karachi-harbor": {
    label: "Karachi Harbor",
    message: "Defend the shipping container yard under the clear coastal sun.",
    weather: "clear",
    city: "Karachi"
  },
  "hyderabad-fort": {
    label: "Hyderabad Fort",
    message: "Protect the historic Pakka Qila battlements and Kotri crossing.",
    weather: "clear",
    city: "Hyderabad"
  },
  "rawalpindi-junction": {
    label: "Rawalpindi Junction",
    message: "Secure the vital railway logistics depot and perimeter barricades.",
    weather: "clear",
    city: "Rawalpindi"
  },
  "islamabad-sector": {
    label: "Islamabad Sector",
    message: "Protect the federal base along the Margalla Hills perimeter.",
    weather: "clear",
    city: "Islamabad"
  },
  "peshawar-gate": {
    label: "Peshawar Gate",
    message: "Hold the ancient Bab-e-Khyber route under the mountain sun.",
    weather: "clear",
    city: "Peshawar"
  },
  "faisalabad-clocktower": {
    label: "Faisalabad Clock Tower",
    message: "Defend the eight-bazaar central hub from heavy alien thrusts.",
    weather: "clear",
    city: "Faisalabad"
  },
  "multan-sun-citadel": {
    label: "Multan Sun Citadel",
    message: "Hold the historic City of Saints citadel against armored invaders.",
    weather: "clear",
    city: "Multan"
  },
  "quetta-pass": {
    label: "Quetta Pass",
    message: "Defend the rugged Chiltan mountain gorge against flanking swarms.",
    weather: "clear",
    city: "Quetta"
  },
  "gwadar-deep-port": {
    label: "Gwadar Deep Port",
    message: "Guard the strategic deep-sea naval installations on the Arabian Sea.",
    weather: "clear",
    city: "Gwadar"
  },
  "murree-pine-ridge": {
    label: "Murree Pine Ridge",
    message: "Hold the alpine pine ridge against high-altitude alien flyers.",
    weather: "rain",
    city: "Murree"
  },
  "skardu-outpost": {
    label: "Skardu Glacial Outpost",
    message: "Repel the alien siege through freezing Karakoram blizzards.",
    weather: "snow",
    city: "Skardu"
  },
  "sialkot-frontier": {
    label: "Sialkot Frontier",
    message: "Shield the fortified border export sector and defense manufacturing.",
    weather: "clear",
    city: "Sialkot"
  },
  "bahawalpur-palace": {
    label: "Bahawalpur Desert Palace",
    message: "Defend the Noor Mahal oasis perimeter through desert sandstorms.",
    weather: "sandstorm",
    city: "Bahawalpur"
  },
  "sukkur-barrage": {
    label: "Sukkur Barrage Defense",
    message: "Protect the historic Indus River regulator arches from destruction.",
    weather: "clear",
    city: "Sukkur"
  },
  "rohtas-bastion": {
    label: "Rohtas Bastion",
    message: "Stand fast upon the massive stone battlements of the ancient fort.",
    weather: "clear",
    city: "Jhelum"
  },
  "khyber-redoubt": {
    label: "Khyber Canyon Redoubt",
    message: "Defend the treacherous canyon pass against heavy bio-titan juggernauts.",
    weather: "clear",
    city: "Khyber"
  },
  "karakoram-apex": {
    label: "Sector Zero: Karakoram Apex",
    message: "Grand Finale: Defeat the Supreme Alien Titan at the K2 summit base!",
    weather: "snow",
    city: "K2 Peak"
  }
};

export const STAGE_KEYS = Object.keys(STAGES);

export function getNextStageKey(currentKey) {
  const index = STAGE_KEYS.indexOf(currentKey);
  if (index >= 0 && index + 1 < STAGE_KEYS.length) {
    return STAGE_KEYS[index + 1];
  }
  // Infinite progression beyond stage 20
  const stageNum = getStageNumber(currentKey);
  return `sector-${stageNum + 1}`;
}

export function getStageNumber(key) {
  if (typeof key === "number") return key;
  const index = STAGE_KEYS.indexOf(key);
  if (index >= 0) return index + 1;
  const match = String(key || "").match(/sector-(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return 1;
}

export function getStageData(keyOrNumber) {
  if (typeof keyOrNumber === "string" && STAGES[keyOrNumber]) {
    return STAGES[keyOrNumber];
  }
  const num = typeof keyOrNumber === "number" ? keyOrNumber : getStageNumber(keyOrNumber);
  if (STAGE_KEYS[num - 1] && STAGES[STAGE_KEYS[num - 1]]) {
    return STAGES[STAGE_KEYS[num - 1]];
  }
  // Infinite procedural generation for stages > 20
  const infiniteWeather = ["clear", "rain", "sandstorm", "snow", "clear", "rain"][(num - 1) % 6];
  const infiniteCities = [
    "Chitral Sky Citadel",
    "Abbottabad Redoubt",
    "Ziarat Juniper Haven",
    "Larkana Indus Bastion",
    "Gilgit River Fortress",
    "Mirpur Lake Perimeter",
    "Muzaffarabad Mountain Pass",
    "Mardan Northern Gate",
    "Kasur Frontier Line",
    "Sargodha Eagle Nest"
  ];
  const cityName = infiniteCities[(num - 21) % infiniteCities.length] || `Deep Frontier Outpost Mark ${num - 20}`;
  return {
    label: `Sector ${num}: ${cityName}`,
    message: `Secure the perimeter in ${cityName}. Infinite alien invasion active.`,
    weather: infiniteWeather,
    city: cityName
  };
}

export function selectStage(context, stageId) {
  const { game, ui } = context;
  const stageData = getStageData(stageId);
  if (!stageData) return;
  game.selectedStage = stageId;
  game.stage = getStageNumber(stageId);
  if (ui.stageButtons) {
    ui.stageButtons.forEach(btn => btn.classList.toggle("selected", btn.dataset.stageId === stageId));
  }
  if (ui.message) {
    ui.message.textContent = stageData.message;
  }
  saveGame(game);
  if (ui) updateUI(ui, game);
  context.refreshStageTheme?.();
}

export function setupStageSelect(context) {
  const { game, ui } = context;
  let lastSelectTime = 0;
  if (!ui.stageButtons) return;
  ui.stageButtons.forEach(button => {
    button.onclick = (e) => {
      const now = performance.now();
      if (now - lastSelectTime < 300) return;
      lastSelectTime = now;
      e?.preventDefault?.();
      e?.stopPropagation?.();
      selectStage(context, button.dataset.stageId);
      // If user was already in-game (not on main menu), restart into the selected stage
      if (game.started && (!ui.startOverlay || ui.startOverlay.style.display === "none")) {
        context.resetGame?.();
      }
    };
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
      if (ui.message) ui.message.textContent = "Campaign Mode active: Liberate all 20 sectors across Pakistan!";
    });

    endlessBtn.addEventListener("click", () => {
      game.isEndless = true;
      endlessBtn.classList.add("selected");
      campaignBtn.classList.remove("selected");
      if (ui.message) ui.message.textContent = `Endless Survival active: Infinite scaling swarms! Best: Wave ${game.endlessHighScore || 0}`;
    });
  }
}
