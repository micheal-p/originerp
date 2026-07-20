// Self-hosted equivalent of Vercel's file-based /api routing (client/api/*.js).
// Each handler already uses the standard Vercel Node signature (req, res),
// so they run unmodified here.
import express from 'express';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, '..', 'client', 'api');

const app = express();
app.use(express.json());

for (const file of readdirSync(apiDir).filter((f) => f.endsWith('.js'))) {
  const name = file.slice(0, -3);
  const { default: handler } = await import(pathToFileURL(path.join(apiDir, file)));
  app.all(`/api/${name}`, (req, res) => handler(req, res));
}

const port = process.env.PORT || 4000;
app.listen(port, '127.0.0.1', () => {
  console.log(`collarone-api listening on 127.0.0.1:${port}`);
});
