import crypto from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawPasscode = (
    env.ADMIN_PASSCODE ||
    env.ADMIN_PASSWORD ||
    env.VITE_ADMIN_PASSCODE ||
    process.env.ADMIN_PASSCODE ||
    process.env.ADMIN_PASSWORD ||
    process.env.VITE_ADMIN_PASSCODE ||
    ''
  ).trim();

  // Compute secure cryptographic hash only - never expose the raw passcode in the client bundle
  const envHash = rawPasscode
    ? crypto.createHash('sha256').update(rawPasscode).digest('hex')
    : '';
  const envHashLower = rawPasscode
    ? crypto.createHash('sha256').update(rawPasscode.toLowerCase()).digest('hex')
    : '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      '__APP_ADMIN_PASSCODE_HASH__': JSON.stringify(envHash),
      '__APP_ADMIN_PASSCODE_HASH_LOWER__': JSON.stringify(envHashLower),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent flickering and continuous reload loops.
      hmr: false,
      watch: null,
    },
  };
});
