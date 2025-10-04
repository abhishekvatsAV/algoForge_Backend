import express from "express";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";

const __fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName);
const MAX_CONCURRENT_EXECUTIONS = 2;
let currentExecutions = 0;

const app = express();
app.use(express.json());

app.post("/run", async (req, res) => {
  if (currentExecutions >= MAX_CONCURRENT_EXECUTIONS) {
    return res.status(503).json({
      error: "Server busy. Please try again in a moment.",
    });
  }

  currentExecutions++;

  try {
    const { code, language, input = "" } = req.body;

    if (!code || !language) {
      currentExecutions--;
      return res.status(400).json({ error: "Code and language required" });
    }

    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const fileName = `Main.${language === "js" ? "js" : "cpp"}`;
    const inputFile = path.join(tempDir, "input.txt");
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, code);
    fs.writeFileSync(inputFile, input);

    let dockerCmd;
    if (language === "js") {
      dockerCmd = `docker run --rm -v "${tempDir}":/app node:22 bash -c "node /app/${fileName} < /app/input.txt"`;
    } else if (language === "cpp") {
      dockerCmd = `docker run --rm -v "${tempDir}":/app gcc:15 bash -c "g++ /app/${fileName} -o /app/a.out && cat /app/input.txt | /app/a.out"`;
    } else {
      currentExecutions--;
      return res.status(400).json({ error: "Unsupported language" });
    }

    exec(dockerCmd, { timeout: 10000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      currentExecutions--;
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(inputFile);
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }

      if (err) {
        return res.status(500).json({
          error: stderr || err.message,
          details: err.toString(),
          code: err.code,
        });
      }

      res.json({ output: stdout || stderr });
    });
  } catch (error) {
    currentExecutions--;
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => {
  console.log("listening on port 4000");
});
