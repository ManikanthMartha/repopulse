import crypto from "crypto";
import { config } from "../config";

const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts a GitHub token using AES-256-CBC
 * Returns { encrypted, iv } for storage
 */
export function encryptToken(token: string): { encrypted: string; iv: string } {
  const key = crypto.scryptSync(config.ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts a GitHub token
 */
export function decryptToken(encrypted: string, ivHex: string): string {
  const key = crypto.scryptSync(config.ENCRYPTION_KEY, "salt", 32);
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generates a secure random state for OAuth CSRF protection
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}
