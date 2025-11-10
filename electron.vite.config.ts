import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import ignore from 'rollup-plugin-ignore';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/main/index.ts'),
        },
        external: [
          // leave test patterns/external libs here if you like
          /\.test\./,
          // Add native modules to external
          'odbc',
          'sqlite3',
          'better-sqlite3',
          'electron-updater',
          'exceljs',
          'electron',
          'fs',
          'path',
        ],
        plugins: [
          // Add the externalize dependencies plugin
          externalizeDepsPlugin({
            exclude: ['electron-log'],
          }),
          // Configure CommonJS plugin to handle dynamic requires
          commonjs({
            dynamicRequireTargets: [
              // Add the paths for native modules
              'node_modules/better-sqlite3/**/*.node',
              'node_modules/sqlite3/**/*.node',
            ],
            exclude: ['electron-log'],
          }),
          // copy root package.json into dist
          copy({
            targets: [
              {
                src: path.resolve(__dirname, 'package.json'),
                dest: path.resolve(__dirname, 'dist'),
              },
              {
                src: path.resolve(__dirname, 'src/services/databaseServiceAdapter.js'),
                dest: path.resolve(__dirname, 'dist/services'),
              },
              {
                src: path.resolve(__dirname, 'src/main/databaseAdapter.js'),
                dest: path.resolve(__dirname, 'dist/main'),
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
      exclude: [
        'mock-aws-s3',
        'nock',
        'aws-sdk',
        '@mapbox/cloudfriend',
        'codecov',
        'nyc',
        'tape',
        'odbc',
        'sqlite3',
        'better-sqlite3',
        'electron-updater',
      ],
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/preload/index.ts'),
        },
        external: [/\.test\./, 'odbc', 'sqlite3', 'better-sqlite3', 'electron-updater'],
        plugins: [
          externalizeDepsPlugin(),
          // Fix: rollup-plugin-ignore expects string array
          // After looking at the source: https://github.com/jackmellis/rollup-plugin-ignore/blob/master/src/index.js
          ignore(['mock-aws-s3', 'odbc', 'sqlite3', 'better-sqlite3']),
        ],
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
        external: [/\.test\./, 'odbc', 'sqlite3', 'better-sqlite3', 'electron-updater'],
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
    plugins: [react()],
  },
});
