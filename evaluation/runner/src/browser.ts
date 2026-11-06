import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright-core";

export const DEFAULT_CDP_PORT = 9222;
export const DEFAULT_PROFILE_DIR = path.resolve(".auth", "chrome-profile");

const CANDIDATE_BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

export function findBrowserExecutable(): string {
  const fromEnv = process.env["AGENTPLACE_BROWSER_PATH"];
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`AGENTPLACE_BROWSER_PATH does not exist: ${fromEnv}`);
    return fromEnv;
  }
  const found = CANDIDATE_BROWSERS.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("No Chrome/Edge found. Set AGENTPLACE_BROWSER_PATH to a Chromium-based browser.");
  return found;
}

/**
 * Starts a normal (non-automated) browser with a dedicated profile and a local debugging port.
 * Logging in to Agentplace (Google SSO) in a normal browser avoids automation-detection blocks;
 * the runner later attaches over CDP and reuses the logged-in session. The profile stays local.
 */
export function launchBrowserForLogin(options: { profileDir: string; port: number; startUrl: string; headless?: boolean }): string {
  const executable = findBrowserExecutable();
  const child = spawn(
    executable,
    [
      `--remote-debugging-port=${options.port}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${options.profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      ...(options.headless ? ["--headless=new"] : []),
      options.startUrl,
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  return executable;
}

export interface Connection {
  browser: Browser;
  context: BrowserContext;
}

export async function connectToBrowser(cdpUrl: string): Promise<Connection> {
  let browser: Browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch (error) {
    throw new Error(
      `Cannot attach to the browser at ${cdpUrl}. Start it with "npm run browser" and sign in to Agentplace first. (${String(error)})`,
    );
  }
  const context = browser.contexts()[0];
  if (!context) throw new Error("The attached browser has no default context.");
  return { browser, context };
}
