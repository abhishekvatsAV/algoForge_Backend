import express from "express";
import cors from "cors";
import path from "path";
import { exec } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.js";
import problemRoutes from "./routes/problem.js";
import { checkAuth } from "./middlewares/auth.js";
import { main } from "./ai/generateProblem.js";
import { PrismaClient } from "./generated/prisma/index.js";
const prisma = new PrismaClient();

const __fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName);
const MAX_CONCURRENT_EXECUTIONS = 2;
let currentExecutions = 0;

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" })); // Increase if needed

// Health check
app.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    currentExecutions: currentExecutions,
    maxExecutions: MAX_CONCURRENT_EXECUTIONS,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Code execution server listening on port ${PORT}`);
});

app.use("/user", userRoutes);
app.use(checkAuth);

app.use("/problem", problemRoutes);

// Run endpoint - accepts JSON with code and input as strings
app.post("/run", async (req, res) => {
  if (currentExecutions >= MAX_CONCURRENT_EXECUTIONS) {
    return res.status(503).json({
      success: false,
      error: "Server busy. Please try again in a moment.",
    });
  }

  currentExecutions++;

  try {
    const { code, input = "", language } = req.body;

    // Validation
    if (!code || !language) {
      currentExecutions--;
      return res.status(400).json({
        success: false,
        error: "Code and language are required",
      });
    }

    if (!["js", "cpp"].includes(language)) {
      currentExecutions--;
      return res.status(400).json({
        success: false,
        error: "Language must be 'js' or 'cpp'",
      });
    }

    // Create unique execution directory
    const executionId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const execDir = path.join(__dirname, "temp", executionId);
    fs.mkdirSync(execDir, { recursive: true });

    const fileName = `Main.${language === "js" ? "js" : "cpp"}`;
    const codePath = path.join(execDir, fileName);
    const inputPath = path.join(execDir, "input.txt");
    const outputPath = path.join(execDir, "output.txt");

    // Write files
    fs.writeFileSync(codePath, code);
    fs.writeFileSync(inputPath, input);

    console.log(`[${executionId}] Executing ${language} code`);

    let dockerCmd;
    if (language === "js") {
      dockerCmd = `docker run --rm --memory="256m" --cpus="0.5" -v "${execDir}":/app node:22 bash -c "node /app/${fileName} < /app/input.txt > /app/output.txt 2>&1"`;
    } else if (language === "cpp") {
      dockerCmd = `docker run --rm --memory="256m" --cpus="0.5" -v "${execDir}":/app gcc:15 bash -c "g++ /app/${fileName} -o /app/a.out > /app/output.txt 2>&1 && /app/a.out < /app/input.txt >> /app/output.txt 2>&1"`;
    }

    exec(dockerCmd, { timeout: 20000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      currentExecutions--;

      try {
        let output = "";

        // Read output file
        if (fs.existsSync(outputPath)) {
          output = fs.readFileSync(outputPath, "utf8");
        } else {
          // Fallback to stdout/stderr if output.txt wasn't created
          output = stdout || stderr || (err ? err.message : "No output generated");
        }

        console.log(`[${executionId}] Execution completed`);

        // Send JSON response
        res.json({
          success: true,
          output: output,
          executionId: executionId,
        });
      } catch (readErr) {
        console.error(`[${executionId}] Error reading output:`, readErr);
        res.status(500).json({
          success: false,
          error: "Failed to read execution results",
          details: readErr.message,
        });
      } finally {
        // Clean up
        setTimeout(() => {
          try {
            fs.rmSync(execDir, { recursive: true, force: true });
            console.log(`[${executionId}] Cleaned up`);
          } catch (cleanupErr) {
            console.error(`[${executionId}] Cleanup error:`, cleanupErr);
          }
        }, 1000);
      }
    });
  } catch (error) {
    currentExecutions--;
    console.error("Unexpected error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

app.post("/submit", async (req, res) => {
  if (currentExecutions >= MAX_CONCURRENT_EXECUTIONS) {
    return res.status(503).json({
      success: false,
      error: "Server busy. Please try again in a moment.",
    });
  }

  currentExecutions++;

  try {
    const { code, language, problemId } = req.body;

    // Validation
    if (!code || !language) {
      currentExecutions--;
      return res.status(400).json({
        success: false,
        error: "Code and language are required",
      });
    }

    if (!["js", "cpp"].includes(language)) {
      currentExecutions--;
      return res.status(400).json({
        success: false,
        error: "Language must be 'js' or 'cpp'",
      });
    }

    // Create unique execution directory
    const executionId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const execDir = path.join(__dirname, "temp", executionId);
    fs.mkdirSync(execDir, { recursive: true });

    const fileName = `Main.${language === "js" ? "js" : "cpp"}`;
    const codePath = path.join(execDir, fileName);
    const inputPath = path.join(execDir, "input.txt");
    const outputPath = path.join(execDir, "output.txt");

    // Write files
    fs.writeFileSync(codePath, code);
    const problem = await prisma.problem.findUnique({
      where: { id: Number(problemId) },
    });

    if (!problem) {
      return res.status(400).json({
        success: false,
        error: "Unable to find the problem check for problemId",
      });
    }

    fs.writeFileSync(inputPath, problem.hidden_input);

    console.log(`[${executionId}] Executing ${language} code`);

    let dockerCmd;
    if (language === "js") {
      dockerCmd = `docker run --rm --memory="256m" --cpus="0.5" -v "${execDir}":/app node:22 bash -c "node /app/${fileName} < /app/input.txt > /app/output.txt 2>&1"`;
    } else if (language === "cpp") {
      dockerCmd = `docker run --rm --memory="256m" --cpus="0.5" -v "${execDir}":/app gcc:15 bash -c "g++ /app/${fileName} -o /app/a.out > /app/output.txt 2>&1 && /app/a.out < /app/input.txt >> /app/output.txt 2>&1"`;
    }

    exec(dockerCmd, { timeout: 20000, maxBuffer: 1024 * 1024 }, async (err, stdout, stderr) => {
      currentExecutions--;

      try {
        let output = "";

        // Read output file
        if (fs.existsSync(outputPath)) {
          output = fs.readFileSync(outputPath, "utf8");
        } else {
          // Fallback to stdout/stderr if output.txt wasn't created
          output = stdout || stderr || (err ? err.message : "No output generated");
        }

        console.log(`[${executionId}] Execution completed`);

        console.log("input : ", problem.hidden_input.trim());
        console.log("🔥 ~ index.js:233 ~ output: ", output.trim());
        console.log("🔥 ~ index.js:235 ~ problem.expected_output: ", problem.expected_output.trim());

        if (output.trim() === problem.expected_output.trim()) {
          const updatedProblem = await prisma.problem.update({
            where: { id: Number(problemId) },
            data: { isSolved: true },
          });

          console.log("🔥 ~ index.js:239 ~ updatedProblem: ", updatedProblem);

          return res.status(200).json({ success: true, isSolved: true, executionId: executionId });
        }

        // Send JSON response
        res.json({
          success: false,
          error: "Not Accepted!",
        });
      } catch (readErr) {
        console.error(`[${executionId}] Error reading output:`, readErr);
        res.status(500).json({
          success: false,
          error: "Failed to read execution results",
          details: readErr.message,
        });
      } finally {
        // Clean up
        setTimeout(() => {
          try {
            fs.rmSync(execDir, { recursive: true, force: true });
            console.log(`[${executionId}] Cleaned up`);
          } catch (cleanupErr) {
            console.error(`[${executionId}] Cleanup error:`, cleanupErr);
          }
        }, 1000);
      }
    });
  } catch (error) {
    currentExecutions--;
    console.error("Unexpected error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

app.get("/generate", async (req, res) => {
  let problem = await main();
  if (!problem) {
    return res.status(400).json({ message: "Sorry Unable to generate problem right now try again after sometime!!" });
  }

  problem.createdById = req.user.id;

  try {
    const newProblem = await prisma.problem.create({
      data: problem,
    });

    return res.status(200).json({ problem: newProblem });
  } catch (e) {
    console.log("error : ", e.message);
    return res.status(400).json({ message: "Unable to create problem!!" });
  }
});
