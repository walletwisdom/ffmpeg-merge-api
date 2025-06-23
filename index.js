const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('✅ FFmpeg Merge API is running');
});

// Merge endpoint
app.post('/merge', (req, res) => {
  const { videoUrls } = req.body;

  if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid videoUrls array' });
  }

  // Log the input for now
  console.log('Received video URLs:', videoUrls);

  // Respond (you'll later add FFmpeg logic here)
  res.json({ message: 'Merge started', videoUrls });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
