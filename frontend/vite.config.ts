import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Route/feature chunks are all well under this now; the old single
      // bundle tripped Rollup's 500 kB warn. Keep a limit, just a realistic one.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Split the rarely-changing framework code (React, React-DOM, the
          // router and their runtime deps) into one long-cached chunk so an
          // app-code deploy doesn't force users to re-download it. Only the
          // React ecosystem is named here on purpose: Leaflet is reached only
          // through the lazy IndiaMineMap import, so leaving it unnamed lets
          // Rollup keep it in its own on-demand chunk.
          manualChunks(id) {
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|history)[\\/]/.test(
                id,
              )
            ) {
              return 'react-vendor';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
