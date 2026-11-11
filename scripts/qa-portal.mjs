#!/usr/bin/env node
/**
 * Portal QA smoke: renders the app in Chromium, collects console/runtime errors,
 * checks mobile overflow, optionally signs in, and screenshots both viewports.
 *
 * Usage:
 *   node scripts/qa-portal.mjs --url http://127.0.0.1:8080 --tag dev
 *   QA_EMAIL=... QA_PASSWORD=... node scripts/qa-portal.mjs --url ... --tag dev
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const url = arg("url", "http://127.0.0.1:8080");
const tag = arg("tag", "dev");
const shotDir = "screenshots";
mkdirSync(shotDir, { recursive: true });

const IGNORED_CONSOLE = [
  "Download the React DevTools",
  /Failed to load resource: the server responded with a status of 40[134]/,
];

const errors = [];
const failedRequests = [];

function recordError(kind, text) {
  if (IGNORED_CONSOLE.some((pattern) => (typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)))) return;
  errors.push({ kind, text });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") recordError("console", message.text());
});
page.on("pageerror", (error) => recordError("pageerror", error.message));
page.on("requestfailed", (request) => {
  failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? "unknown" });
});

const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
const status = response?.status() ?? 0;
await page.waitForTimeout(1200);

const title = await page.title();
const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
const rootChildren = await page.evaluate(() => document.querySelector("#root")?.children.length ?? 0);
const desktopShot = `${shotDir}/portal-${tag}-desktop.png`;
await page.screenshot({ path: desktopShot, fullPage: false });

// Sign-in flow (optional).
let signIn = null;
if (process.env.QA_EMAIL && process.env.QA_PASSWORD) {
  await page.getByPlaceholder("yourname@institution.et").fill(process.env.QA_EMAIL);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForTimeout(1200);
  const passwordField = page.getByPlaceholder("••••••••");
  if (await passwordField.count()) {
    await passwordField.fill(process.env.QA_PASSWORD);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
  }
  await page.waitForTimeout(2800);
  const afterText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
  const errorText = await page
    .locator('[role="alert"], .text-danger, .text-red-400')
    .allInnerTexts()
    .catch(() => []);
  signIn = {
    signedIn: !/PORTAL ACCESS/i.test(afterText),
    excerpt: afterText.slice(0, 260),
    errorText,
    shot: `${shotDir}/portal-${tag}-signed-in.png`,
  };
  await page.screenshot({ path: signIn.shot, fullPage: false });
}

// API probes from the browser session (same cookies).
const api = {};
for (const path of ["/api/auth/config", "/api/auth/session", "/api/drive/status", "/api/github/status"]) {
  const result = await page.evaluate(async (endpoint) => {
    try {
      const res = await fetch(endpoint, { credentials: "same-origin" });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 300) };
    } catch (error) {
      return { status: 0, body: String(error) };
    }
  }, path);
  api[path] = result;
}

// Mobile pass.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mobilePage = await mobile.newPage();
mobilePage.on("console", (message) => {
  if (message.type() === "error") recordError("mobile-console", message.text());
});
mobilePage.on("pageerror", (error) => recordError("mobile-pageerror", error.message));
await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
await mobilePage.waitForTimeout(1200);
const overflow = await mobilePage.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));
const mobileShot = `${shotDir}/portal-${tag}-mobile.png`;
await mobilePage.screenshot({ path: mobileShot, fullPage: false });

await browser.close();

const verdict = {
  ok:
    status === 200 &&
    bodyText.length > 40 &&
    errors.length === 0 &&
    overflow.scrollWidth <= overflow.innerWidth + 1 &&
    (!signIn || signIn.signedIn),
  url,
  status,
  title,
  rootChildren,
  desktopShot,
  mobileShot,
  overflow,
  bodyPreview: bodyText.slice(0, 500),
  errors,
  failedRequests: failedRequests.filter((entry) => !/favicon/i.test(entry.url)),
  signIn,
  api,
};

console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
