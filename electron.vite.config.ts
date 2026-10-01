import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The production renderer is loaded from file://, which the main process's
 * onHeadersReceived hook never sees, so a response-header CSP does not protect
 * a packaged build. Inject the policy as a <meta> tag instead.
 *
 * Keep in sync with CSP_POLICY in src/main/index.ts. The dev server needs its
 * HMR websocket allowed; the production policy must not carry that exception.
 */
function cspMetaPlugin() {
  const base = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ];

  return {
    name: 'csp-meta',
    transformIndexHtml(_html: string, ctx: { server?: unknown }) {
      const isDev = ctx.server !== undefined;
      // The dev server needs its HMR websocket; production needs nothing.
      const connectSrc = isDev ? "connect-src 'self' ws://localhost:5173" : "connect-src 'self'";
      const policy = [...base, connectSrc].join('; ');

      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend' as const,
        },
      ];
    },
  };
}

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/main/index.ts'),
        },
        external: [
          /\.test\./,
          'better-sqlite3',
          'electron-updater',
          'electron-log/main',
          'exceljs',
          'electron',
          'fs',
          'path',
        ],
        plugins: [
          externalizeDepsPlugin({
            exclude: ['electron-log'],
          }),
          commonjs({
            dynamicRequireTargets: ['node_modules/better-sqlite3/**/*.node'],
            exclude: ['electron-log'],
          }),
          // copy root package.json into dist
          copy({
            targets: [
              {
                src: path.resolve(__dirname, 'package.json'),
                dest: path.resolve(__dirname, 'dist'),
              },
            ],
            // keep folder structure flat
            flatten: true,
          }),
        ],
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
        },
      },
    },
    optimizeDeps: {
      // Exclude native modules from optimization
      exclude: ['better-sqlite3', 'electron-updater'],
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/preload/index.ts'),
        },
        external: [/\.test\./, 'better-sqlite3', 'electron-updater'],
        plugins: [externalizeDepsPlugin()],
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: path.resolve(__dirname, 'src/renderer'),
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        external: [/\.test\./, 'better-sqlite3', 'electron-updater'],
      },
    },
    server: {
      port: 5173,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
        '@services': path.resolve(__dirname, 'src/services'),
      },
    },
    plugins: [react(), cspMetaPlugin()],
  },
});
