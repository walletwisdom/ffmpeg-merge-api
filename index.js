const axios = require("axios");

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
    // Download video file
    const videoResponse = await axios({ url: videoUrl, responseType: "stream" });
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(videoPath);
      videoResponse.data.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Download audio file
    const audioResponse = await axios({ url: audioUrl, responseType: "stream" });
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(audioPath);
      audioResponse.data.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Merge audio + video using FFmpeg
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
      .on("end", () => {
        // Cleanup temp files
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);

        const fileUrl = `${req.protocol}://${req.get("host")}/public/${outputFilename}`;
        res.json({ fileUrl });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "Error during merging" });
      })
      .save(outputPath);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Error downloading files" });
  }
});
