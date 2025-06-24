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
app.post('/merge', async (req, res) => {
  const { videoUrls } = req.body;

  if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length < 2) {
    return res.status(400).json({ error: 'Missing or invalid videoUrls array' });
  }

  try {
    const timestamp = Date.now();
    const outputFilename = `merged-${timestamp}.mp4`;
    const outputPath = path.join(__dirname, 'output', outputFilename);

    // Build FFmpeg input file list
    const inputList = videoUrls.map((url, index) => `file 'input${index}.mp4'`).join('\n');
    const inputListPath = path.join(__dirname, 'input.txt');

    // Download all videos to local disk
    const download = require('node-fetch');
    const fs = require('fs');

    for (let i = 0; i < videoUrls.length; i++) {
      const response = await download(videoUrls[i]);
      const buffer = await response.buffer();
      fs.writeFileSync(path.join(__dirname, `input${i}.mp4`), buffer);
    }

    fs.writeFileSync(inputListPath, inputList);

    // Run FFmpeg concat
    exec(`ffmpeg -f concat -safe 0 -i input.txt -c copy ${outputPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg error: ${error.message}`);
        return res.status(500).json({ error: 'Failed to merge videos' });
      }

      console.log('FFmpeg output:', stdout);
      return res.status(200).json({
        message: 'Merge successful',
        videoUrl: `https://ffmpeg-merge-api-production-4c8c.up.railway.app/output/${outputFilename}`
      });
    });

  } catch (err) {
    console.error('Merge error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
