import { readFileSync } from "node:fs";
import type { Scenario } from "./types.js";

const REQUIRED_STRING_ARRAYS = ["user_turns", "expected_behaviour", "critical_failures"] as const;

function assertStringArray(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${where} must be an array of strings`);
  }
  return value as string[];
}

export function parseScenarios(json: unknown, source = "scenarios"): Scenario[] {
  const list = (json as { scenarios?: unknown }).scenarios;
  if (!Array.isArray(list)) throw new Error(`${source}: missing "scenarios" array`);
  const seen = new Set<string>();
  return list.map((raw: Record<string, unknown>, index) => {
    const id = raw["id"];
    if (typeof id !== "string" || !/^[A-Z]\d{3}$/.test(id)) throw new Error(`${source}[${index}]: invalid id ${String(id)}`);
    if (seen.has(id)) throw new Error(`${source}: duplicate id ${id}`);
    seen.add(id);
    const arrays = Object.fromEntries(
      REQUIRED_STRING_ARRAYS.map((key) => [key, assertStringArray(raw[key], `${source}:${id}.${key}`)]),
    ) as Record<(typeof REQUIRED_STRING_ARRAYS)[number], string[]>;
    if (arrays.user_turns.length < 2) throw new Error(`${source}:${id} needs at least two user turns`);
    if (arrays.user_turns.some((turn) => turn.trim() === "")) throw new Error(`${source}:${id} has an empty user turn`);
    return {
      id,
      title: String(raw["title"] ?? ""),
      category: String(raw["category"] ?? ""),
      rule_ids: assertStringArray(raw["rule_ids"] ?? [], `${source}:${id}.rule_ids`),
      source_ids: assertStringArray(raw["source_ids"] ?? [], `${source}:${id}.source_ids`),
      ...arrays,
    };
  });
}

export function loadScenarios(file: string): Scenario[] {
  return parseScenarios(JSON.parse(readFileSync(file, "utf-8")), file);
}

export function selectScenarios(all: Scenario[], ids: string[] | "all"): Scenario[] {
  if (ids === "all") return all;
  const byId = new Map(all.map((scenario) => [scenario.id, scenario]));
  return ids.map((id) => {
    const scenario = byId.get(id.toUpperCase());
    if (!scenario) throw new Error(`Unknown test id: ${id}`);
    return scenario;
  });
}
