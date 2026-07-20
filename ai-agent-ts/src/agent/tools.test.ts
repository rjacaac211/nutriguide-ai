import { describe, it, expect } from "vitest";
import { parseSelectionToIndex } from "./tools.js";

describe("parseSelectionToIndex", () => {
  it("returns null for null/undefined input", () => {
    expect(parseSelectionToIndex(null, 3)).toBeNull();
    expect(parseSelectionToIndex(undefined, 3)).toBeNull();
  });

  it.each(["cancel", "never mind", "nevermind", "no", "stop"])(
    "returns -1 for the cancel word %j",
    (word) => {
      expect(parseSelectionToIndex(word, 3)).toBe(-1);
    }
  );

  it("normalizes case and whitespace for cancel words", () => {
    expect(parseSelectionToIndex("  CANCEL  ", 3)).toBe(-1);
  });

  it("maps an in-range numeric string to a 0-based index", () => {
    expect(parseSelectionToIndex("1", 3)).toBe(0);
    expect(parseSelectionToIndex("2", 3)).toBe(1);
    expect(parseSelectionToIndex("3", 3)).toBe(2);
  });

  it("returns null for an out-of-range numeric string", () => {
    expect(parseSelectionToIndex("4", 3)).toBeNull();
    expect(parseSelectionToIndex("0", 3)).toBeNull();
  });

  it("is lenient like parseInt for a numeric-prefixed string", () => {
    // parseInt("1abc", 10) === 1, so this is accepted even though it isn't a clean number.
    expect(parseSelectionToIndex("1abc", 3)).toBe(0);
  });

  it("maps first/second/third word phrasing to 0/1/2", () => {
    expect(parseSelectionToIndex("first", 3)).toBe(0);
    expect(parseSelectionToIndex("the first one", 3)).toBe(0);
    expect(parseSelectionToIndex("second", 3)).toBe(1);
    expect(parseSelectionToIndex("the second one", 3)).toBe(1);
    expect(parseSelectionToIndex("third", 3)).toBe(2);
    expect(parseSelectionToIndex("the third one", 3)).toBe(2);
  });

  it("normalizes case and whitespace for word-based selections", () => {
    expect(parseSelectionToIndex("  FIRST  ", 3)).toBe(0);
  });

  it("bounds-checks numeric strings outside 1-3, but not 1/2/3 or their word forms", () => {
    // "4" has no literal fallback, so an out-of-range optionCount genuinely rejects it.
    expect(parseSelectionToIndex("4", 1)).toBeNull();
    // But "2" (and "second") DO have a hardcoded literal-equality fallback below the
    // bounds check, so they fall through to it and return 1 regardless of optionCount —
    // the bounds check only actually matters for numbers outside 1-3. Range-checking
    // against the real option list is left entirely to the caller.
    expect(parseSelectionToIndex("2", 1)).toBe(1);
    expect(parseSelectionToIndex("second", 1)).toBe(1);
  });

  it("returns null for unrecognized words", () => {
    expect(parseSelectionToIndex("fourth", 4)).toBeNull();
    expect(parseSelectionToIndex("banana", 3)).toBeNull();
  });

  it("coerces non-string resumeValue via String()", () => {
    expect(parseSelectionToIndex(1, 3)).toBe(0);
    expect(parseSelectionToIndex({}, 3)).toBeNull();
  });
});
