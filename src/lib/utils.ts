import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
}

export function hapticVibrate(type: "light" | "medium" | "heavy" | "success" | "error" = "light") {
  if (typeof window === "undefined" || !navigator.vibrate) return;

  try {
    switch (type) {
      case "light":
        navigator.vibrate(50);
        break;
      case "medium":
        navigator.vibrate(100);
        break;
      case "heavy":
        navigator.vibrate(200);
        break;
      case "success":
        navigator.vibrate([50, 50, 100]); // Short, short, long
        break;
      case "error":
        navigator.vibrate([100, 50, 100, 50, 100]); // stutter
        break;
      default:
        navigator.vibrate(50);
    }
  } catch (e) {
    // Ignore errors (e.g., if user hasn't interacted with document yet)
  }
}
