import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      '__APP_ADMIN_PASSCODE__': JSON.stringify(
        process.env.ADMIN_PASSCODE ||
        process.env.VITE_ADMIN_PASSCODE ||
        process.env.ADMIN_PASSWORD ||
        ''
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
