import type { BrowserContext, Page } from "playwright-core";
import { CompletionTracker, textWarnings, type UiSnapshot } from "./completion.js";
import type { Link } from "./types.js";

/** All DOM knowledge about the Agentplace standalone Preview lives here; selectors were verified against the live UI on 2026-11-06. */
const SELECTORS = {
  composer: ".stage-composer",
  railTurn: "[data-rail-turn]",
  response: "[data-stage-page] .stage-canvas-page",
  busy: "[aria-busy='true']",
};

export interface UiTimeouts {
  loadMs: number;
  turnMs: number;
  stableMs: number;
  pollMs: number;
  /** Browser language sent to the Preview; the agent answers in the UI locale, so it is pinned for reproducibility. */
  locale: string;
}

export interface TurnCapture {
  agent: string;
  links: Link[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  warnings: string[];
}

export function assertPreviewUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.agentplace.io") || !url.pathname.includes("/preview")) {
    throw new Error(
      `Refusing to drive ${url.origin}${url.pathname}: expected a standalone Preview URL (https://<id>-preview.run.agentplace.io/agent/<id>/preview). ` +
        "The Builder chat on agentplace.io must never be automated because it changes the agent.",
    );
  }
  url.search = "";
  url.hash = "";
  return url;
}

export class PreviewConversation {
  private constructor(
    private readonly page: Page,
    private readonly timeouts: UiTimeouts,
    readonly sessionId: string,
    readonly navigatorLanguage: string | null,
  ) {}

  static async open(context: BrowserContext, previewUrl: URL, timeouts: UiTimeouts): Promise<PreviewConversation> {
    // A brand-new tab has empty sessionStorage, so the Preview creates a new agent session.
    const page = await context.newPage();
    try {
      const cdp = await context.newCDPSession(page);
      const userAgent = await page.evaluate(() => navigator.userAgent);
      await cdp.send("Emulation.setUserAgentOverride", { userAgent, acceptLanguage: timeouts.locale });
      await cdp.send("Emulation.setLocaleOverride", { locale: timeouts.locale });
      await page.goto(previewUrl.toString(), { waitUntil: "domcontentloaded", timeout: timeouts.loadMs });
      assertPreviewUrl(page.url());
      await page.getByRole("textbox").waitFor({ timeout: timeouts.loadMs });
      await page.waitForFunction(
        (sel) => document.querySelector(sel)?.getAttribute("data-pending") === "false" && !!document.querySelector("article"),
        SELECTORS.composer,
        { timeout: timeouts.loadMs },
      );
      const initial = await page.evaluate((rail) => document.querySelectorAll(rail).length, SELECTORS.railTurn);
      if (initial !== 1) throw new Error(`Expected a fresh conversation with only the welcome page, found ${initial} history entries`);
      const sessionId = await page.evaluate(() => sessionStorage.getItem("agentplace_session_id"));
      if (!sessionId) throw new Error("Preview did not expose a session id; cannot verify conversation isolation");
      const language = await page.evaluate(() => navigator.language);
      if (language !== timeouts.locale) throw new Error(`Browser language is ${language}, expected ${timeouts.locale}`);
      return new PreviewConversation(page, timeouts, sessionId, language);
    } catch (error) {
      await page.close().catch(() => undefined);
      throw error;
    }
  }

  async sendTurn(message: string): Promise<TurnCapture> {
    assertPreviewUrl(this.page.url());
    const before = await this.snapshot();
    const input = this.page.getByRole("textbox");
    await input.fill(message);
    if ((await input.inputValue()) !== message) throw new Error("Message text in the input field differs from the scenario text");
    const startedAt = new Date();
    await this.page.keyboard.press("Enter");

    const expectedRail = before.railTurns + 1;
    const tracker = new CompletionTracker({
      railTurnsAfterSend: expectedRail,
      previousResponseText: before.responseText,
      stableMs: this.timeouts.stableMs,
    });
    const deadline = Date.now() + this.timeouts.turnMs;
    for (;;) {
      const progress = tracker.observe(await this.snapshot(), Date.now());
      if (progress === "complete") break;
      if (Date.now() > deadline) throw new Error(`Timed out after ${this.timeouts.turnMs} ms (last state: ${progress})`);
      await this.page.waitForTimeout(this.timeouts.pollMs);
    }
    const warnings: string[] = [];
    const rail = await this.page.evaluate(
      (sel) => [...document.querySelectorAll(`${sel} button`)].map((b) => b.getAttribute("aria-label") ?? ""),
      SELECTORS.railTurn,
    );
    if (rail.length !== expectedRail) throw new Error(`History shows ${rail.length} entries, expected ${expectedRail}`);
    if (!(rail[rail.length - 1] ?? "").includes(message.slice(0, 30))) warnings.push("history entry label does not contain the sent message prefix");
    const sessionNow = await this.page.evaluate(() => sessionStorage.getItem("agentplace_session_id"));
    if (sessionNow !== this.sessionId) throw new Error("Session id changed mid-conversation; context may have been lost");

    const { text, links } = await this.page.evaluate((sel) => {
      const root = document.querySelector<HTMLElement>(sel);
      return {
        text: root?.innerText ?? "",
        links: [...(root?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])].map((a) => ({ text: a.innerText.trim(), href: a.href })),
      };
    }, SELECTORS.response);
    const completedAt = new Date();
    warnings.push(...textWarnings(text));
    return {
      agent: text.trim(),
      links,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      warnings,
    };
  }

  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: false });
  }

  async close(): Promise<void> {
    await this.page.close().catch(() => undefined);
  }

  private snapshot(): Promise<UiSnapshot> {
    return this.page.evaluate((sel) => {
      const pending = document.querySelector(sel.composer)?.getAttribute("data-pending");
      return {
        railTurns: document.querySelectorAll(sel.railTurn).length,
        pending: pending === null || pending === undefined ? null : pending === "true",
        busy: document.querySelector(sel.busy) !== null,
        responseText: document.querySelector<HTMLElement>(sel.response)?.innerText ?? "",
      };
    }, SELECTORS);
  }
}
