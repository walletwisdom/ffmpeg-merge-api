const express = require("express");
const cors = require("cors");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Root route for Railway health check
app.get("/", (req, res) => {
  res.send("✅ FFmpeg Merge API is running on Railway.");
});

app.post("/merge", async (req, res) => {
  const { videoUrl, audioUrl } = req.body;

  if (!videoUrl || !audioUrl) {
    return res.status(400).json({ error: "Missing videoUrl or audioUrl" });
  }

  const outputFilename = `${uuidv4()}.mp4`;
  const outputPath = path.join(publicDir, outputFilename);

  ffmpeg()
    .input(videoUrl)
    .input(audioUrl)
    .outputOptions([
      "-c:v copy",        // copy the video stream
      "-c:a aac",         // encode audio to AAC
      "-shortest"         // match the shortest stream duration
    ])
    .on("end", () => {
      const fileUrl = `${req.protocol}://${req.get("host")}/public/${outputFilename}`;
      res.json({ fileUrl });
    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
      res.status(500).json({ error: "Error during merging" });
    })
    .save(outputPath);
});

app.use("/public", express.static(publicDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ FFmpeg Merge API running on port ${port}`);
});
