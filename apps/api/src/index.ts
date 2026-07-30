import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import { trackMetadataRouter } from './routes/trackMetadata';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const allowedOrigins = (process.env.ALLOWED_WEB_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  throw new Error('ALLOWED_WEB_ORIGIN is not set');
}

app.use(cors({ origin: allowedOrigins }));
app.use('/api/track-metadata', trackMetadataRouter);

app.listen(port, () => {
  console.log(`api listening on :${port}`);
});
