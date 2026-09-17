function isNativeAndroid() {
  const capacitor = window.Capacitor;
  return Boolean(capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === "android");
}

async function loadAdsModule() {
  if (!isNativeAndroid()) return null;
  try {
    return await import("./ads.js");
  } catch (error) {
    console.warn("Native ads unavailable", error);
    return null;
  }
}

export async function setupAdsIfAvailable() {
  const ads = await loadAdsModule();
  return ads ? ads.setupAds() : false;
}

export async function showInterstitialAtBreakIfAvailable(reason, wave = 0) {
  const ads = await loadAdsModule();
  return ads ? ads.showInterstitialAtBreak(reason, wave) : false;
}

export async function showRewardedContinueIfAvailable() {
  const ads = await loadAdsModule();
  return ads ? ads.showRewardedContinue() : false;
}

export async function showRewardedDoubleLootIfAvailable(context) {
  const ads = await loadAdsModule();
  if (ads && typeof ads.showRewardedDoubleLoot === "function") {
    return ads.showRewardedDoubleLoot(context);
  }
  // Browser fallback simulation
  const bonus = Math.max(120, (context.game.runCoins || 100));
  context.game.coins += bonus;
  context.game.runCoins += bonus;
  if (context.ui.message) context.ui.message.textContent = `2X REWARD CLAIMED! +${bonus} coins added!`;
  return true;
}

export function isRewardedContinueAvailable() {
  const capacitor = window.Capacitor;
  return Boolean(capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === "android")
    && localStorage.getItem("alienBaseDefense.removeAds") !== "true"
    && !window.__alienBaseDefense?.game?.noAds;
}
