import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: this config previously inlined GEMINI_API_KEY into the client bundle
// via `define`, left over from the AI Studio scaffold. Nothing in the app used
// it, and inlining a secret into a public bundle is a trap waiting for the day
// someone puts a real key in .env.local. Removed. If a model-backed feature is
// added later it must go through a server-side proxy, never a bundled key.
import fs from 'fs';

/**
 * Serve the CSV snapshots committed at the repo root under /dataset/*.csv.
 *
 * The repo ships dataset_Case.csv, dataset_Votes.csv and so on, but the app
 * only ever read them from a public GCS bucket — so it could not run without
 * network access, and the committed files were dead weight. This maps
 * /dataset/Case.csv -> ./dataset_Case.csv in dev, which makes the dashboard
 * work offline and lets the local snapshot be tested before it is uploaded.
 */
const localDatasetPlugin = () => ({
  name: 'local-dataset',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const match = /^\/dataset\/([A-Za-z]+)\.csv$/.exec((req.url || '').split('?')[0]);
      if (!match) return next();

      const file = path.resolve(__dirname, `dataset_${match[1]}.csv`);
      if (!fs.existsSync(file)) {
        res.statusCode = 404;
        res.end(`No local snapshot for ${match[1]}.csv`);
        return;
      }
      res.setHeader('Content-Type', 'text/csv');
      fs.createReadStream(file).pipe(res);
    });
  },
});

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), localDatasetPlugin()],
      define: {
        // Dev reads the committed local snapshots; production reads the GCS
        // bucket. Override either with VITE_DATA_BASE_URL.
        __DATA_BASE_URL__: JSON.stringify(
          process.env.VITE_DATA_BASE_URL ??
            (mode === 'development'
              ? '/dataset/'
              : 'https://storage.googleapis.com/scc-dashboard-dataset-2023/dataset/')
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
