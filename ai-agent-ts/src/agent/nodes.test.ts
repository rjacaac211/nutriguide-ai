import { describe, it, expect } from "vitest";
import { parseLogFoodMessage } from "./nodes.js";

describe("parseLogFoodMessage", () => {
  it("parses grams with a default meal_type of lunch when omitted", () => {
    expect(parseLogFoodMessage("log 100g chicken")).toEqual({
      search_query: "chicken",
      grams: 100,
      meal_type: "lunch",
    });
  });

  it("parses grams with an explicit meal_type", () => {
    expect(parseLogFoodMessage("log 100g chicken for dinner")).toEqual({
      search_query: "chicken",
      grams: 100,
      meal_type: "dinner",
    });
  });

  it("is case-insensitive on the verb, unit, and meal words", () => {
    expect(parseLogFoodMessage("LOG 100G CHICKEN FOR DINNER")).toEqual({
      search_query: "CHICKEN",
      grams: 100,
      meal_type: "dinner",
    });
  });

  it("accepts a space between the number and the g unit", () => {
    expect(parseLogFoodMessage("log 100 g chicken")).toEqual({
      search_query: "chicken",
      grams: 100,
      meal_type: "lunch",
    });
  });

  it("supports add/record as alternatives to log", () => {
    expect(parseLogFoodMessage("add 50g almonds for snack")).toEqual({
      search_query: "almonds",
      grams: 50,
      meal_type: "snack",
    });
    expect(parseLogFoodMessage("record 200g rice for dinner")).toEqual({
      search_query: "rice",
      grams: 200,
      meal_type: "dinner",
    });
  });

  it("does not support decimal grams (grams regex is digits-only)", () => {
    expect(parseLogFoodMessage("log 100.5g chicken")).toBeNull();
  });

  it("rejects zero or unparseable gram amounts", () => {
    expect(parseLogFoodMessage("log 0g chicken")).toBeNull();
    expect(parseLogFoodMessage("log -5g chicken")).toBeNull();
  });

  it("parses whole-number portion amounts (amount + unit)", () => {
    expect(parseLogFoodMessage("log 1 cup rice for dinner")).toEqual({
      search_query: "rice",
      amount: 1,
      unit: "cup",
      meal_type: "dinner",
    });
  });

  it("parses decimal portion amounts", () => {
    expect(parseLogFoodMessage("log 1.5 cups rice for dinner")).toEqual({
      search_query: "rice",
      amount: 1.5,
      unit: "cups",
      meal_type: "dinner",
    });
  });

  it("defaults meal_type to lunch for portion messages too", () => {
    expect(parseLogFoodMessage("log 2 servings oatmeal")).toEqual({
      search_query: "oatmeal",
      amount: 2,
      unit: "servings",
      meal_type: "lunch",
    });
  });

  it("rejects zero or negative portion amounts", () => {
    expect(parseLogFoodMessage("log 0 cups rice")).toBeNull();
  });

  it("returns null for units that aren't in the recognized grams/portion lists", () => {
    expect(parseLogFoodMessage("log 2 grams chicken")).toBeNull();
    expect(parseLogFoodMessage("log 1 bowl rice")).toBeNull();
  });

  it("returns null when there's no food name to search for", () => {
    expect(parseLogFoodMessage("log 100g")).toBeNull();
    expect(parseLogFoodMessage("log 100g ")).toBeNull();
  });

  it("returns null for messages that don't match the log-food pattern at all", () => {
    expect(parseLogFoodMessage("what should I eat for lunch?")).toBeNull();
    expect(parseLogFoodMessage("")).toBeNull();
  });

  it("matches even when the log phrase isn't at the start of the message (regex has no ^ anchor)", () => {
    expect(parseLogFoodMessage("please log 100g chicken for lunch")).toEqual({
      search_query: "chicken",
      grams: 100,
      meal_type: "lunch",
    });
  });

  it("swallows an unrecognized trailing 'for X' clause into the food name instead of stripping it", () => {
    // "brunch" isn't one of the 4 recognized meal words, so the optional
    // "for <meal>" group doesn't match at all, and the whole "for brunch"
    // phrase gets captured by the food-name group instead.
    expect(parseLogFoodMessage("log 100g chicken for brunch")).toEqual({
      search_query: "chicken for brunch",
      grams: 100,
      meal_type: "lunch",
    });
  });

  it("captures multi-word food names correctly when a valid meal clause follows", () => {
    expect(parseLogFoodMessage("log 100g chicken breast for dinner")).toEqual({
      search_query: "chicken breast",
      grams: 100,
      meal_type: "dinner",
    });
  });
});
