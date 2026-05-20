import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  MaxAdContentRating,
  RewardAdPluginEvents
} from "@capacitor-community/admob";

const INTERSTITIAL_AD_ID = "ca-app-pub-1797269464593835/1599051538";
const REWARDED_AD_ID = "ca-app-pub-1797269464593835/5429880091";
const USE_LIVE_ADS = import.meta.env.VITE_ADMOB_LIVE === "true";
const INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000;
const WAVE_CLEAR_AD_INTERVAL = 3;
const AD_DISMISS_TIMEOUT_MS = 60 * 1000;
const REWARDED_DISMISS_TIMEOUT_MS = 5 * 60 * 1000;
const REWARDED_RETRY_DELAY_MS = 15 * 1000;

let initialized = false;
let consentAllowsAds = false;
let requestNonPersonalizedAds = false;
let interstitialReady = false;
let interstitialPreparing = false;
let lastInterstitialShownAt = 0;
let lastWaveClearAdAt = 0;
let pendingDismissResolve = null;
let rewardedReady = false;
let rewardedPreparing = false;
let rewardedPreparePromise = null;
let rewardedRetryTimer = null;
let pendingRewardResolve = null;
let pendingRewardEarned = false;

export async function setupAds() {
  if (!isNativeAndroid() || initialized) return false;

  try {
    await AdMob.initialize({
      maxAdContentRating: MaxAdContentRating.ParentalGuidance
    });

    initialized = true;
    await requestConsent();
    registerInterstitialListeners();
    registerRewardedListeners();
    await prepareInterstitial();
    await prepareRewarded();
    return true;
  } catch (error) {
    console.warn("AdMob setup skipped", error);
    return false;
  }
}

export async function showInterstitialAtBreak(reason, wave = 0) {
  if (!canShowInterstitial(reason, wave)) {
    await prepareInterstitial();
    return false;
  }

  try {
    const dismissed = waitForInterstitialDismiss();
    await AdMob.showInterstitial();
    lastInterstitialShownAt = Date.now();
    if (reason === "wave-clear") lastWaveClearAdAt = wave;
    interstitialReady = false;
    await dismissed;
    await prepareInterstitial();
    return true;
  } catch (error) {
    console.warn("Interstitial ad skipped", error);
    resolvePendingDismiss();
    interstitialReady = false;
    await prepareInterstitial();
    return false;
  }
}

export function isRewardedContinueSupported() {
  return isNativeAndroid() && !areAdsRemoved();
}

export async function showRewardedContinue() {
  if (!initialized || !consentAllowsAds || areAdsRemoved()) return false;

  if (!rewardedReady) {
    await prepareRewarded();
  }

  if (!rewardedReady) return false;

  try {
    const rewarded = waitForRewardedResult();
    await AdMob.showRewardVideoAd()
      .then(rewardItem => {
        if (rewardItem) markPendingRewardEarned();
      })
      .catch(error => {
        console.warn("Rewarded ad show failed", error);
        resolvePendingReward(false);
      });

    const earnedReward = await rewarded;
    rewardedReady = false;
    await prepareRewarded();
    return earnedReward;
  } catch (error) {
    console.warn("Rewarded ad skipped", error);
    resolvePendingReward(false);
    rewardedReady = false;
    await prepareRewarded();
    return false;
  }
}

function isNativeAndroid() {
  return Capacitor.isNativePlatform?.() && Capacitor.getPlatform?.() === "android";
}

async function requestConsent() {
  try {
    let consentInfo = await AdMob.requestConsentInfo();
    if (consentInfo.status === AdmobConsentStatus.REQUIRED && consentInfo.isConsentFormAvailable) {
      consentInfo = await AdMob.showConsentForm();
    }

    consentAllowsAds = consentInfo.status === AdmobConsentStatus.NOT_REQUIRED
      || consentInfo.status === AdmobConsentStatus.OBTAINED;
    requestNonPersonalizedAds = consentInfo.status !== AdmobConsentStatus.NOT_REQUIRED;
  } catch (error) {
    console.warn("AdMob consent unavailable", error);
    consentAllowsAds = true;
    requestNonPersonalizedAds = true;
  }
}

function registerInterstitialListeners() {
  AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
    interstitialReady = true;
    interstitialPreparing = false;
  });

  AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
    interstitialReady = false;
    interstitialPreparing = false;
  });

  AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    interstitialReady = false;
    resolvePendingDismiss();
  });

  AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
    interstitialReady = false;
    resolvePendingDismiss();
  });
}

function registerRewardedListeners() {
  AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
    rewardedReady = true;
    rewardedPreparing = false;
    clearRewardedRetry();
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
    rewardedReady = false;
    rewardedPreparing = false;
    scheduleRewardedRetry();
  });

  AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    rewardedReady = false;
    markPendingRewardEarned();
  });

  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
    rewardedReady = false;
    resolvePendingReward(pendingRewardEarned);
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
    rewardedReady = false;
    resolvePendingReward(false);
    scheduleRewardedRetry();
  });
}

async function prepareInterstitial() {
  if (!initialized || !consentAllowsAds || interstitialReady || interstitialPreparing || areAdsRemoved()) return false;

  interstitialPreparing = true;
  try {
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: !USE_LIVE_ADS,
      npa: requestNonPersonalizedAds
    });
    interstitialReady = true;
    interstitialPreparing = false;
    return true;
  } catch (error) {
    console.warn("Interstitial prepare failed", error);
    interstitialReady = false;
    interstitialPreparing = false;
    return false;
  }
}

async function prepareRewarded() {
  if (!initialized || !consentAllowsAds || areAdsRemoved()) return false;
  if (rewardedReady) return true;
  if (rewardedPreparing && rewardedPreparePromise) return rewardedPreparePromise;

  rewardedPreparing = true;
  clearRewardedRetry();

  rewardedPreparePromise = AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_ID,
      isTesting: !USE_LIVE_ADS,
      npa: requestNonPersonalizedAds
    })
    .then(() => {
      rewardedReady = true;
      rewardedPreparing = false;
      return true;
    })
    .catch(error => {
      console.warn("Rewarded ad prepare failed", error);
      rewardedReady = false;
      rewardedPreparing = false;
      scheduleRewardedRetry();
      return false;
    })
    .finally(() => {
      rewardedPreparePromise = null;
    });

  return rewardedPreparePromise;
}

function canShowInterstitial(reason, wave) {
  if (!initialized || !consentAllowsAds || !interstitialReady || interstitialPreparing || areAdsRemoved()) return false;
  if (Date.now() - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS) return false;
  if (reason === "wave-clear" && wave - lastWaveClearAdAt < WAVE_CLEAR_AD_INTERVAL) return false;
  return true;
}

function waitForInterstitialDismiss() {
  resolvePendingDismiss();
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      pendingDismissResolve = null;
      resolve();
    }, AD_DISMISS_TIMEOUT_MS);

    pendingDismissResolve = () => {
      clearTimeout(timeout);
      pendingDismissResolve = null;
      resolve();
    };
  });
}

function waitForRewardedResult() {
  resolvePendingReward(false);
  pendingRewardEarned = false;
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      const earnedReward = pendingRewardEarned;
      pendingRewardResolve = null;
      pendingRewardEarned = false;
      resolve(earnedReward);
    }, REWARDED_DISMISS_TIMEOUT_MS);

    pendingRewardResolve = earnedReward => {
      clearTimeout(timeout);
      pendingRewardResolve = null;
      pendingRewardEarned = false;
      resolve(Boolean(earnedReward));
    };
  });
}

function resolvePendingDismiss() {
  if (pendingDismissResolve) pendingDismissResolve();
}

function resolvePendingReward(earnedReward) {
  if (pendingRewardResolve) pendingRewardResolve(earnedReward);
}

function markPendingRewardEarned() {
  pendingRewardEarned = true;
}

function scheduleRewardedRetry() {
  if (rewardedRetryTimer || !initialized || !consentAllowsAds || areAdsRemoved()) return;
  rewardedRetryTimer = setTimeout(() => {
    rewardedRetryTimer = null;
    prepareRewarded();
  }, REWARDED_RETRY_DELAY_MS);
}

function clearRewardedRetry() {
  if (!rewardedRetryTimer) return;
  clearTimeout(rewardedRetryTimer);
  rewardedRetryTimer = null;
}

function areAdsRemoved() {
  return localStorage.getItem("alienBaseDefense.removeAds") === "true";
}
