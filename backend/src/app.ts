import express from 'express';
import cors from 'cors';
import { envConfig } from './config/env';
import { healthRouter } from './routes/healthRoutes';
import { aaRouter } from './routes/aaRoutes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Development CORS configuration
app.use(
  cors({
    origin: [envConfig.clientOrigin, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/aa', aaRouter);

// Global Error Handler
app.use(errorHandler);
