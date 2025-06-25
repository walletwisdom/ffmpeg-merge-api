const express = require("express");
const cors = require("cors");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Health check
app.get("/", (req, res) => {
  res.send("✅ FFmpeg Merge API is running.");
});

app.post("/merge", async (req, res) => {
  const { videoUrl, audioUrl } = req.body;

  if (!videoUrl || !audioUrl) {
    return res.status(400).json({ error: "Missing videoUrl or audioUrl" });
  }

  const videoPath = path.join(__dirname, `${uuidv4()}_video.mp4`);
  const audioPath = path.join(__dirname, `${uuidv4()}_audio.mp3`);
  const outputFilename = `${uuidv4()}.mp4`;
  const outputPath = path.join(publicDir, outputFilename);

  try {
    // Download video
    const videoResponse = await axios({ url: videoUrl, responseType: "stream" });
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(videoPath);
      videoResponse.data.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Download audio
    const audioResponse = await axios({ url: audioUrl, responseType: "stream" });
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(audioPath);
      audioResponse.data.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Merge using ffmpeg
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-c:a aac",
        "-strict experimental",
        "-shortest"
      ])
      .on("end", () => {
        // Delete temp files
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);

        const fileUrl = `${req.protocol}://${req.get("host")}/${outputFilename}`;
        res.json({ fileUrl });
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
        res.status(500).json({ error: "Error during merging", details: err.message });
      })
      .save(outputPath);

  } catch (err) {
    console.error("❌ Download error:", err.message);
    res.status(500).json({ error: "Failed to download media", details: err.message });
  }
});

// Serve merged files
app.use("/public", express.static(publicDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ FFmpeg Merge API running on port ${port}`);
});
