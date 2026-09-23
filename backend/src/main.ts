import express from 'express';
import authRoutes from './routes/auth.routes';
import protectedRoutes from './routes/protected.example.routes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routing
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', protectedRoutes);

app.listen(PORT, () => {
  console.log(`[Smart Bus API] Server is running on port ${PORT}`);
});

export default app;
