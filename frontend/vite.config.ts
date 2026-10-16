import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
let productionBuild = false;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'responsive-hero',
      enforce: 'pre',
      configResolved(config) {
        productionBuild = config.command === 'build';
      },
      async load(id) {
        if (!id.endsWith('.webp?responsive')) return;
        const file = id.slice(0, -'?responsive'.length);
        // Vite dev serves the original; hashed responsive assets are emitted at build time.
        if (!productionBuild)
          return `export default {src:${JSON.stringify('/@fs/' + file)},srcSet:''};`;
        const variants = [];
        for (const width of [480, 960, 1440]) {
          const source = await sharp(file)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 78 })
            .toBuffer();
          const ref = this.emitFile({ type: 'asset', name: `bus-${width}.webp`, source });
          variants.push({ width, ref });
        }
        const urls = variants.map(v => `import.meta.ROLLUP_FILE_URL_${v.ref}`);
        return `export default {src:${urls[1]},srcSet:[${variants
          .map((v, i) => `${urls[i]} + ' ${v.width}w'`)
          .join(',')}].join(', ')};`;
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rolldownOptions: {
      input: {
        app: 'index.html',
        landing: 'landing.html',
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
