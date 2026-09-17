import { registerPlugin } from "@capacitor/core";
import { saveGame } from "./saveSystem.js";
import { updateUI } from "./ui.js";

export const IAP_PRODUCTS = {
  NO_ADS_STARTER_PACK: {
    id: "starter_pack_no_ads",
    title: "VIP Defender Starter Pack",
    price: "$2.99",
    coins: 500,
    description: "Permanently removes all interstitial ads + 500 bonus coins!"
  }
};

let BillingPlugin = null;
try {
  BillingPlugin = registerPlugin("BillingPlugin");
} catch {
  BillingPlugin = null;
}

export async function setupIAP(context) {
  if (!BillingPlugin) return false;
  try {
    const result = await BillingPlugin.initialize();
    if (result && result.purchasedNoAds) {
      context.game.noAds = true;
      saveGame(context.game);
      updateUI(context.ui, context.game);
    }
    return true;
  } catch (err) {
    console.warn("IAP Billing initialization skipped:", err);
    return false;
  }
}

export async function purchaseStarterPack(context) {
  const { game, ui } = context;
  if (game.noAds) {
    if (ui.message) ui.message.textContent = "You already own the VIP Starter Pack!";
    return true;
  }

  try {
    if (BillingPlugin && typeof BillingPlugin.launchBillingFlow === "function") {
      const response = await BillingPlugin.launchBillingFlow({ productId: IAP_PRODUCTS.NO_ADS_STARTER_PACK.id });
      if (response && response.success) {
        applyNoAdsPurchase(context);
        return true;
      }
    } else {
      // Web / PWA / Test environment prompt
      const confirmPurchase = window.confirm(
        `Purchase ${IAP_PRODUCTS.NO_ADS_STARTER_PACK.title} for ${IAP_PRODUCTS.NO_ADS_STARTER_PACK.price}?\n\n` +
        `• Permanently removes all interstitial ads\n` +
        `• Grants 500 Bonus Plasma Coins\n` +
        `• Unlocks VIP Defender Status`
      );
      if (confirmPurchase) {
        applyNoAdsPurchase(context);
        return true;
      }
    }
  } catch (err) {
    console.warn("Purchase failed or canceled:", err);
    if (ui.message) ui.message.textContent = "Purchase canceled or unavailable.";
  }
  return false;
}

export function applyNoAdsPurchase(context) {
  const { game, ui } = context;
  game.noAds = true;
  game.coins += IAP_PRODUCTS.NO_ADS_STARTER_PACK.coins;
  saveGame(game);
  if (ui.message) ui.message.textContent = "VIP Starter Pack Activated! Ads removed + 500 coins added!";
  updateUI(ui, game);
  if (ui.shopButtons) {
    const vipBtn = document.getElementById("buyStarterPackBtn");
    if (vipBtn) {
      vipBtn.textContent = "VIP DEFENDER (ACTIVATED)";
      vipBtn.disabled = true;
    }
  }
}
