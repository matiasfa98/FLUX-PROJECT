// backend/services/dockerService.js
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs/promises");
const fileService = require("./fileService");

const MAX_OUTPUT = 100_000;
const DEFAULT_TIMEOUT = 10_000;

const LANGUAGE_CONFIG = {
  javascript: {
    image: "node:22-alpine",
    cmd: (file) => ["node", `/workspace/${file}`],
  },
  typescript: {
    image: "node:22-alpine",
    cmd: (file) => ["sh", "-c", `npx --yes tsx /workspace/${file}`],
  },
  python: {
    image: "python:3.13-alpine",
    cmd: (file) => ["python", "-u", `/workspace/${file}`],
  },
  lua: {
    image: "nickblah/lua:5.4",
    cmd: (file) => ["lua", `/workspace/${file}`],
  },
  go: {
    image: "golang:1.24-alpine",
    cmd: (file) => ["sh", "-c", `go run /workspace/${file}`],
  },
  rust: {
    image: "rust:1.85-alpine",
    cmd: (file) => [
      "sh",
      "-c",
      `rustc /workspace/${file} -o /tmp/flux-app && /tmp/flux-app`,
    ],
  },
  cpp: {
    image: "gcc:14-alpine",
    cmd: (file) => [
      "sh",
      "-c",
      `g++ -O2 /workspace/${file} -o /tmp/flux-app && /tmp/flux-app`,
    ],
  },
};

function normalizeLanguage(language) {
  if (!language || typeof language !== "string") return "javascript";
  const normalized = language.toLowerCase().trim();
  const aliases = {
    js: "javascript",
    node: "javascript",
    ts: "typescript",
    py: "python",
    lua54: "lua",
    golang: "go",
    rs: "rust",
    "c++": "cpp",
  };
  return aliases[normalized] || normalized;
}

function getLanguageConfig(language) {
  const normalized = normalizeLanguage(language);
  const config = LANGUAGE_CONFIG[normalized];
  if (!config) {
    throw new Error(`Unsupported language: ${normalized}`);
  }
  return config;
}

function limitOutput(text) {
  if (!text) return "";
  if (text.length <= MAX_OUTPUT) return text;
  return text.slice(0, MAX_OUTPUT) + "\n\n[Flux] Output limit reached.\n";
}

/**
 * Normalizes Windows drive paths (e.g., C:\path -> //c/path) for Docker volume binds
 */
function toDockerPath(hostPath) {
  const resolved = path.resolve(hostPath).replace(/\\/g, "/");
  // If Windows drive path (e.g. C:/Users/...), format to //c/Users/...
  if (/^[A-Za-z]:\//.test(resolved)) {
    return resolved.replace(/^([A-Za-z]):\//, (match, drive) => `//${drive.toLowerCase()}/`);
  }
  return resolved;
}

async function runDockerContainer(workingDir, language, codeContent = "", filename = "main.js") {
  const normalizedLanguage = normalizeLanguage(language);
  const config = getLanguageConfig(normalizedLanguage);

  const safeFilename = path.basename(filename || "main.js");
  const targetFilePath = path.join(workingDir, safeFilename);

  // Normalize CRLF to LF to avoid bash syntax errors inside Alpine Linux containers
  const cleanCode = codeContent.replace(/\r\n/g, "\n");
  await fs.writeFile(targetFilePath, cleanCode, "utf8");

  const containerName = `flux-run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const dockerMountPath = toDockerPath(workingDir);
  const containerCmd = config.cmd(safeFilename);

  const args = [
    "run",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--memory",
    "256m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "64",
    "-v",
    `${dockerMountPath}:/workspace:rw`,
    "-w",
    "/workspace",
    config.image,
    ...containerCmd,
  ];

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn("docker", args, { windowsHide: true });

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();

      const cleanup = spawn("docker", ["rm", "-f", containerName], {
        windowsHide: true,
      });
      cleanup.on("error", () => {});

      resolve({
        success: false,
        stdout: limitOutput(stdout),
        stderr: limitOutput(stderr) + "\n\n[Flux] Execution timed out (10s limit).\n",
        exitCode: 137,
        timedOut: true,
      });
    }, DEFAULT_TIMEOUT);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT);
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      reject(new Error(`Docker execution failed: ${error.message}`));
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({
        success: code === 0,
        stdout: limitOutput(stdout),
        stderr: limitOutput(stderr),
        exitCode: code,
        timedOut: false,
      });
    });
  });
}

module.exports = {
  runDockerContainer,
  getLanguageConfig,
  normalizeLanguage,
};