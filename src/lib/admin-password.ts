import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SCRYPT_COST = 16_384;
const PASSWORD_SCRYPT_BLOCK_SIZE = 8;
const PASSWORD_SCRYPT_PARALLELIZATION = 1;
const PASSWORD_SCRYPT_MAX_MEMORY = 32 * 1024 * 1024;
export const MINIMUM_ADMIN_PASSWORD_LENGTH = 14;
const PASSWORD_HASH_PATTERN = new RegExp(
  `^[a-f0-9]{${PASSWORD_KEY_LENGTH * 2}}$`,
  "i"
);

function parsePasswordHash(value: string) {
  const [salt, hash, ...extra] = value.split(":");
  if (
    extra.length > 0 ||
    !salt ||
    !hash ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !PASSWORD_HASH_PATTERN.test(hash)
  ) {
    return null;
  }

  return { salt, hash: Buffer.from(hash, "hex") };
}

export function isAdminPasswordHashValid(value: string): boolean {
  return parsePasswordHash(value) !== null;
}

export function createAdminPasswordHash(password: string): string {
  if (password.length < MINIMUM_ADMIN_PASSWORD_LENGTH || password.length > 1024) {
    throw new Error("Admin passwords must be between 14 and 1024 characters.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_SCRYPT_COST,
    r: PASSWORD_SCRYPT_BLOCK_SIZE,
    p: PASSWORD_SCRYPT_PARALLELIZATION,
    maxmem: PASSWORD_SCRYPT_MAX_MEMORY,
  });

  return `${salt}:${hash.toString("hex")}`;
}

export function verifyAdminPassword(password: string, passwordHash: string): boolean {
  if (password.length < MINIMUM_ADMIN_PASSWORD_LENGTH || password.length > 1024) {
    return false;
  }

  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) return false;

  const actual = scryptSync(password, parsed.salt, parsed.hash.length, {
    N: PASSWORD_SCRYPT_COST,
    r: PASSWORD_SCRYPT_BLOCK_SIZE,
    p: PASSWORD_SCRYPT_PARALLELIZATION,
    maxmem: PASSWORD_SCRYPT_MAX_MEMORY,
  });

  return timingSafeEqual(actual, parsed.hash);
}
