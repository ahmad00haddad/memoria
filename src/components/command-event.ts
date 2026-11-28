// خفيف عمداً: يُستورد من الصفحات دون سحب لوحة الأوامر الثقيلة.
export const OPEN_COMMAND_EVENT = "memoria:open-command";

/** يفتح لوحة الأوامر من أي زر في الصفحة. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_COMMAND_EVENT));
}
