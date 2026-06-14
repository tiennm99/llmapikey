import assert from "node:assert/strict";
import { test } from "node:test";

import {
  encodeSecret,
  signSessionToken,
  verifySessionToken,
} from "../lib/auth/session-token.js";

const SECRET = encodeSecret("x".repeat(48));
const IDENTITY = { githubUserId: "12345", githubUsername: "octocat" };

test("session token round-trips identity", async () => {
  const token = await signSessionToken(IDENTITY, SECRET);
  const decoded = await verifySessionToken(token, SECRET);
  assert.deepEqual(decoded, IDENTITY);
});

test("tampered token verifies to null", async () => {
  const token = await signSessionToken(IDENTITY, SECRET);
  const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");
  assert.equal(await verifySessionToken(tampered, SECRET), null);
});

test("token signed with a different secret verifies to null", async () => {
  const token = await signSessionToken(IDENTITY, SECRET);
  const otherSecret = encodeSecret("y".repeat(48));
  assert.equal(await verifySessionToken(token, otherSecret), null);
});

test("non-numeric subject is rejected", async () => {
  const token = await signSessionToken(
    { githubUserId: "octocat", githubUsername: "octocat" },
    SECRET,
  );
  assert.equal(await verifySessionToken(token, SECRET), null);
});

test("expired token verifies to null", async () => {
  const { SignJWT } = await import("jose");
  const expired = await new SignJWT({ login: "octocat" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("12345")
    .setIssuedAt(0)
    .setExpirationTime(1) // epoch+1s — long past
    .sign(SECRET);
  assert.equal(await verifySessionToken(expired, SECRET), null);
});

test("missing token verifies to null", async () => {
  assert.equal(await verifySessionToken(undefined, SECRET), null);
  assert.equal(await verifySessionToken("", SECRET), null);
});

test("encodeSecret rejects short/missing secrets", () => {
  assert.throws(() => encodeSecret(undefined));
  assert.throws(() => encodeSecret("tooshort"));
  assert.doesNotThrow(() => encodeSecret("z".repeat(32)));
});
