import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { cpSync, mkdirSync, existsSync } from 'fs';

const apps = [
  { dir: 'home', route: 'home', nested: [] },
  { dir: 'calendar', route: 'calendar', nested: ['settings'] },
];

const notFound = { dir: 'notfound', route: '404' };

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'post-build-copy',
      closeBundle() {
        const dist = resolve(__dirname, 'dist');

        for (const { dir, route, nested } of apps) {
          const src = resolve(dist, 'src', dir, 'index.html');
          const dest = resolve(dist, route, 'index.html');
          if (existsSync(src)) {
            mkdirSync(resolve(dist, route), { recursive: true });
            cpSync(src, dest);

            for (const sub of nested || []) {
              const subDir = resolve(dist, route, sub);
              mkdirSync(subDir, { recursive: true });
              cpSync(src, resolve(subDir, 'index.html'));
            }
          }
        }

        const notFoundSrc = resolve(dist, 'src', notFound.dir, 'index.html');
        const notFoundDest = resolve(dist, notFound.route, 'index.html');
        if (existsSync(notFoundSrc)) {
          mkdirSync(resolve(dist, notFound.route), { recursive: true });
          cpSync(notFoundSrc, notFoundDest);
          cpSync(notFoundSrc, resolve(dist, '404.html'));
        }

        const rootSrc = resolve(__dirname, 'index.html');
        const rootDest = resolve(dist, 'index.html');
        if (existsSync(rootSrc)) {
          cpSync(rootSrc, rootDest);
        }
      }
    }
  ],
  publicDir: 'static',
  resolve: {
    alias: {
      '$shared': resolve(__dirname, 'src/shared'),
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'src/home/index.html'),
        calendar: resolve(__dirname, 'src/calendar/index.html'),
        notfound: resolve(__dirname, 'src/notfound/index.html'),
      }
    }
  }
});
