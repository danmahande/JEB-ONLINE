/*
 * Start the standalone production server with NODE_ENV=production,
 * teeing stdout+stderr to server.log (cross-platform replacement for:
 *   NODE_ENV=production bun .next/standalone/server.js 2>&1 | tee server.log
 * ).
 * Added in round 19: package.json was repointed at this script by the
 * agent-host commit 59ac7e6 without the script itself ever being
 * committed — `npm run start` failed with MODULE_NOT_FOUND until this
 * file landed (auditor repair, see AGENT-FIXLIST.md ROUND 19).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const server = path.join(root, ".next", "standalone", "server.js");

if (!fs.existsSync(server)) {
  console.error("start-prod: missing .next/standalone/server.js — run `npm run build` first");
  process.exit(1);
}

const logPath = path.join(root, "server.log");
const logStream = fs.createWriteStream(logPath, { flags: "a" });

const child = spawn(process.execPath, [server], {
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["inherit", "pipe", "pipe"],
});

const tee = (chunk) => {
  process.stdout.write(chunk);
  logStream.write(chunk);
};

child.stdout.on("data", tee);
child.stderr.on("data", tee);
child.on("exit", (code, signal) => {
  logStream.end();
  console.error(`start-prod: server exited (${signal ? `signal ${signal}` : `code ${code}`})`);
  process.exitCode = code ?? 1;
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
