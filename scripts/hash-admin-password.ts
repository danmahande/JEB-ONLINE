import { createAdminPasswordHash } from "../src/lib/admin-password";

async function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal so the password stays hidden.");
  }

  return new Promise((resolve, reject) => {
    let password = "";
    const finish = (error?: Error) => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (chunk: Buffer | string) => {
      const input = chunk.toString();
      if (input === "\u0003") {
        finish(new Error("Password generation cancelled."));
      } else if (input === "\r" || input === "\n") {
        finish();
      } else if (input === "\u007f" || input === "\b") {
        password = password.slice(0, -1);
      } else {
        password += input;
      }
    };

    process.stdout.write("Admin password (14+ characters, input hidden): ");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function main() {
  const password = await readHiddenPassword();
  const passwordHash = createAdminPasswordHash(password);
  process.stdout.write(`ADMIN_PASSWORD_HASH=${passwordHash}\n`);
  process.stdout.write("Copy this value to your deployment environment; do not commit it.\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Password hash generation failed.";
  console.error(message);
  process.exitCode = 1;
});
