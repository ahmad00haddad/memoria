import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// إعداد مستقل عن vite.config.ts (بدون إضافات Cloudflare/TanStack) لاختبارات المنطق الصرف.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
