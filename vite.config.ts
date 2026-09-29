/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "支援士 学習ノート",
        short_name: "支援士ノート",
        description: "情報処理安全確保支援士試験の学習管理と一問一答",
        lang: "ja",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f7f6",
        theme_color: "#0f6b5c",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            // Google Fonts をオフラインでも表示できるようにキャッシュする
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  build: {
    // Firebase（認証とFirestore）を含むため1チャンクが大きくなる。PWAで事前キャッシュするので分割しない
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
