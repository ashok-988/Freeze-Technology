const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { PORT } = require('./config/env');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Root & Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'Freeze Technology ERP Backend API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`FREEZE TECHNOLOGY ERP BACKEND RUNNING ON PORT ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
