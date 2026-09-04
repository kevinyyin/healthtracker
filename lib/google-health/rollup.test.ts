import { describe, expect, it } from "vitest";
import {
  groupSessionsByDate,
  parseStageMinutes,
  parseStageSegments,
  selectMainSleepCluster,
  type SleepSessionRow,
} from "@/lib/google-health/rollup";

const TZ = "America/New_York";

function session(id: string, startTime: string, endTime: string, stageSummary: unknown = null): SleepSessionRow {
  return { id, start_time: startTime, end_time: endTime, stage_summary: stageSummary };
}

describe("parseStageSegments", () => {
  it("returns [] for non-array input", () => {
    expect(parseStageSegments(null)).toEqual([]);
    expect(parseStageSegments(undefined)).toEqual([]);
    expect(parseStageSegments("not an array")).toEqual([]);
    expect(parseStageSegments({})).toEqual([]);
  });

  it("returns [] for an empty array", () => {
    expect(parseStageSegments([])).toEqual([]);
  });

  it("filters out malformed entries", () => {
    const result = parseStageSegments([
      { type: "LIGHT", startTime: "2026-09-04T02:00:00Z", endTime: "2026-09-04T02:30:00Z" },
      null,
      "garbage",
      { type: "DEEP" }, // missing startTime/endTime
      { type: 5, startTime: "2026-09-04T02:30:00Z", endTime: "2026-09-04T03:00:00Z" }, // wrong type field
      { startTime: "2026-09-04T03:00:00Z", endTime: "2026-09-04T03:30:00Z" }, // missing type
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("LIGHT");
  });

  it("sorts segments by startTime regardless of input order", () => {
    const result = parseStageSegments([
      { type: "DEEP", startTime: "2026-09-04T03:00:00Z", endTime: "2026-09-04T03:30:00Z" },
      { type: "LIGHT", startTime: "2026-09-04T01:00:00Z", endTime: "2026-09-04T02:00:00Z" },
      { type: "REM", startTime: "2026-09-04T02:00:00Z", endTime: "2026-09-04T02:30:00Z" },
    ]);
    expect(result.map((s) => s.type)).toEqual(["LIGHT", "REM", "DEEP"]);
  });
});

describe("parseStageMinutes", () => {
  const sessionStart = "2026-09-04T00:00:00Z";

  it("returns all-null fallback for empty/unparseable stage_summary", () => {
    expect(parseStageMinutes(null, sessionStart)).toEqual({
      deep: null,
      rem: null,
      light: null,
      awake: null,
      wakeCount: null,
      latencyMinutes: null,
      asleepStart: null,
      asleepEnd: null,
    });
    expect(parseStageMinutes([], sessionStart)).toEqual({
      deep: null,
      rem: null,
      light: null,
      awake: null,
      wakeCount: null,
      latencyMinutes: null,
      asleepStart: null,
      asleepEnd: null,
    });
  });

  it("sums stage minutes per type", () => {
    const result = parseStageMinutes(
      [
        { type: "LIGHT", startTime: "2026-09-04T00:30:00Z", endTime: "2026-09-04T01:00:00Z" }, // 30
        { type: "DEEP", startTime: "2026-09-04T01:00:00Z", endTime: "2026-09-04T01:45:00Z" }, // 45
        { type: "REM", startTime: "2026-09-04T01:45:00Z", endTime: "2026-09-04T02:00:00Z" }, // 15
        { type: "LIGHT", startTime: "2026-09-04T02:00:00Z", endTime: "2026-09-04T02:20:00Z" }, // +20 = 50
      ],
      sessionStart,
    );
    expect(result.deep).toBe(45);
    expect(result.rem).toBe(15);
    expect(result.light).toBe(50);
  });

  it("counts only mid-sleep AWAKE segments toward wakeCount, excluding lead-in and final wake-up", () => {
    const result = parseStageMinutes(
      [
        // lead-in, not a wake-up
        { type: "AWAKE", startTime: "2026-09-04T00:00:00Z", endTime: "2026-09-04T00:15:00Z" },
        { type: "LIGHT", startTime: "2026-09-04T00:15:00Z", endTime: "2026-09-04T01:00:00Z" },
        // mid-sleep disturbance
        { type: "AWAKE", startTime: "2026-09-04T01:00:00Z", endTime: "2026-09-04T01:05:00Z" },
        { type: "DEEP", startTime: "2026-09-04T01:05:00Z", endTime: "2026-09-04T02:00:00Z" },
        // final wake-up, not a disturbance
        { type: "AWAKE", startTime: "2026-09-04T02:00:00Z", endTime: "2026-09-04T02:10:00Z" },
      ],
      sessionStart,
    );
    expect(result.wakeCount).toBe(1);
    expect(result.latencyMinutes).toBe(15);
    expect(result.asleepStart).toBe("2026-09-04T00:15:00Z");
    expect(result.asleepEnd).toBe("2026-09-04T02:00:00Z");
  });

  it("returns null wakeCount/latencyMinutes/asleepStart/asleepEnd when the session never leaves AWAKE", () => {
    const result = parseStageMinutes(
      [{ type: "AWAKE", startTime: "2026-09-04T00:00:00Z", endTime: "2026-09-04T00:30:00Z" }],
      sessionStart,
    );
    expect(result.wakeCount).toBeNull();
    expect(result.latencyMinutes).toBeNull();
    expect(result.asleepStart).toBeNull();
    expect(result.asleepEnd).toBeNull();
    expect(result.awake).toBe(30);
    expect(result.deep).toBeNull();
  });

  it("handles unsorted input by sorting before computing latency/wakeCount", () => {
    const result = parseStageMinutes(
      [
        { type: "DEEP", startTime: "2026-09-04T01:05:00Z", endTime: "2026-09-04T02:00:00Z" },
        { type: "AWAKE", startTime: "2026-09-04T00:00:00Z", endTime: "2026-09-04T00:15:00Z" },
        { type: "LIGHT", startTime: "2026-09-04T00:15:00Z", endTime: "2026-09-04T01:00:00Z" },
        { type: "AWAKE", startTime: "2026-09-04T01:00:00Z", endTime: "2026-09-04T01:05:00Z" },
      ],
      sessionStart,
    );
    expect(result.latencyMinutes).toBe(15);
    expect(result.wakeCount).toBe(1);
  });
});

describe("groupSessionsByDate", () => {
  it("buckets sessions by the local date their end_time falls on", () => {
    const a = session("a", "2026-09-04T05:00:00Z", "2026-09-04T13:00:00Z"); // ~09:00 local Sep 4
    const b = session("b", "2026-09-04T14:00:00Z", "2026-09-04T15:00:00Z"); // ~11:00 local Sep 4
    const c = session("c", "2026-09-05T05:00:00Z", "2026-09-05T13:00:00Z"); // ~09:00 local Sep 5
    const grouped = groupSessionsByDate([a, b, c], TZ);
    expect([...grouped.keys()].sort()).toEqual(["2026-09-04", "2026-09-05"]);
    expect(grouped.get("2026-09-04")).toEqual([a, b]);
    expect(grouped.get("2026-09-05")).toEqual([c]);
  });
});

describe("selectMainSleepCluster", () => {
  it("keeps a single session as-is", () => {
    const a = session("a", "2026-09-04T03:00:00Z", "2026-09-04T10:00:00Z");
    const { sessions, excluded } = selectMainSleepCluster([a]);
    expect(sessions).toEqual([a]);
    expect(excluded).toEqual([]);
  });

  it("merges adjacent sessions within the gap threshold into one cluster", () => {
    const a = session("a", "2026-09-04T02:00:00Z", "2026-09-04T05:00:00Z");
    const b = session("b", "2026-09-04T05:40:00Z", "2026-09-04T09:00:00Z"); // 40 min gap
    const { sessions, excluded } = selectMainSleepCluster([a, b]);
    expect(sessions.map((s) => s.id)).toEqual(["a", "b"]);
    expect(excluded).toEqual([]);
  });

  it("excludes a far-apart shorter session (a nap) rather than blending it in", () => {
    const nap = session("nap", "2026-09-04T18:00:00Z", "2026-09-04T18:30:00Z"); // 30 min nap
    const main = session("main", "2026-09-05T02:00:00Z", "2026-09-05T10:00:00Z"); // main sleep, 7.5h later
    const { sessions, excluded } = selectMainSleepCluster([nap, main]);
    expect(sessions.map((s) => s.id)).toEqual(["main"]);
    expect(excluded.map((s) => s.id)).toEqual(["nap"]);
  });

  it("transitively chain-merges a run of adjacent sessions even if the endpoints are far apart", () => {
    const a = session("a", "2026-09-04T02:00:00Z", "2026-09-04T03:00:00Z");
    const b = session("b", "2026-09-04T03:30:00Z", "2026-09-04T05:00:00Z"); // 30 min after a
    const c = session("c", "2026-09-04T05:45:00Z", "2026-09-04T08:00:00Z"); // 45 min after b
    // a -> c gap is 2h45m, over the 1h threshold, but the chain a-b-c merges transitively.
    const { sessions, excluded } = selectMainSleepCluster([a, b, c]);
    expect(sessions.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(excluded).toEqual([]);
  });

  it("is independent of input order — the direct regression test for the original bug", () => {
    const nap = session("nap", "2026-09-04T18:00:00Z", "2026-09-04T18:30:00Z");
    const main = session("main", "2026-09-05T02:00:00Z", "2026-09-05T10:00:00Z");
    const forward = selectMainSleepCluster([nap, main]);
    const backward = selectMainSleepCluster([main, nap]);
    expect(forward.sessions.map((s) => s.id)).toEqual(backward.sessions.map((s) => s.id));
    expect(forward.excluded.map((s) => s.id)).toEqual(backward.excluded.map((s) => s.id));
  });
});
