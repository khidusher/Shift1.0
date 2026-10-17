import crypto from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      '__APP_ADMIN_PASSCODE_HASH__': JSON.stringify(
        (process.env.ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE || process.env.ADMIN_PASSWORD)
          ? crypto.createHash('sha256').update(
              (process.env.ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE || process.env.ADMIN_PASSWORD || '').trim()
            ).digest('hex')
          : ''
      ),
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
