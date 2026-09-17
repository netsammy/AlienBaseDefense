import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export async function triggerHaptic(type = "light") {
  try {
    if (type === "light") {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (type === "medium") {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (type === "heavy") {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if (type === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === "warning") {
      await Haptics.notification({ type: NotificationType.Warning });
    }
  } catch {
    // Fallback to web vibration API if available
    try {
      if (navigator.vibrate) {
        if (type === "light") navigator.vibrate(15);
        else if (type === "medium") navigator.vibrate(30);
        else if (type === "heavy") navigator.vibrate(60);
        else if (type === "warning") navigator.vibrate([40, 30, 40]);
        else navigator.vibrate(20);
      }
    } catch {
      // Ignore vibration errors
    }
  }
}
