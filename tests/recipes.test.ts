import { describe, it, expect, vi, afterEach } from "vitest";
import { initialState, parseImport, recipes } from "../src/data";
import { recipeSchema } from "../src/recipes/schema";
import {
  normalizeMeal,
  searchOnlineRecipes,
  onlineQuery,
  webRecipeSearch,
} from "../src/recipes/online";
import { mergeWorkspaces } from "../src/cloud/merge";
const meal = {
  idMeal: "52772",
  strMeal: "Chicken Handi",
  strCategory: "Chicken",
  strInstructions: "Chop the onion.\r\n\r\nCook the chicken thoroughly.",
  strIngredient1: "Chicken",
  strMeasure1: "500 g",
  strIngredient2: "Onion",
  strMeasure2: "1 large",
  strSource: "https://example.com/recipe",
};
afterEach(() => vi.unstubAllGlobals());
describe("internet and personal recipes", () => {
  it("validates existing recipes and preserves unknown external nutrition and amounts", () => {
    for (const recipe of recipes)
      expect(recipeSchema.safeParse(recipe).success).toBe(true);
    const r = normalizeMeal(meal, "Ужин")!;
    expect(r).toMatchObject({
      id: "mealdb-52772",
      category: "Ужин",
      servings: null,
      calories: null,
      time: null,
      sourceUrl: meal.strSource,
    });
    expect(r.ingredients).toEqual([
      ["Chicken", null, "500 g"],
      ["Onion", null, "1 large"],
    ]);
    expect(r.steps).toHaveLength(2);
  });
  it("rejects incomplete meals and unsafe source protocols", () => {
    expect(normalizeMeal({ ...meal, strInstructions: "" }, "Обед")).toBeNull();
    expect(normalizeMeal({ ...meal, idMeal: "../bad" }, "Обед")).toBeNull();
    expect(
      normalizeMeal({ ...meal, strSource: "javascript:alert(1)" }, "Обед")
        ?.sourceUrl,
    ).toBe("https://www.themealdb.com/meal/52772");
    expect(
      recipeSchema.safeParse({
        ...normalizeMeal(meal, "Обед"),
        sourceUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
  it("maps common Russian ingredients, encodes web queries and deduplicates results", async () => {
    expect(onlineQuery(" Курица ")).toBe("chicken");
    expect(onlineQuery("constructor")).toBe("constructor");
    expect(
      new URL(webRecipeSearch("рис & овощи", "Обед")).searchParams.get("text"),
    ).toContain("рис & овощи");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ meals: [meal, meal] })));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await searchOnlineRecipes("курица", "Обед", new AbortController().signal),
    ).toHaveLength(1);
    expect(fetcher.mock.calls[0][0]).toContain("search.php?s=chicken");
  });
  it("falls back to ingredient search and loads complete recipes, never saving list stubs", async () => {
    const responses = [
      { meals: null },
      { meals: [{ idMeal: "52772" }, { idMeal: "invalid" }] },
      { meals: [meal] },
    ];
    const fetcher = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify(responses.shift())),
      );
    vi.stubGlobal("fetch", fetcher);
    const found = await searchOnlineRecipes(
      "onion",
      "Обед",
      new AbortController().signal,
    );
    expect(found[0].steps).toHaveLength(2);
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([
        expect.stringContaining("filter.php?i=onion"),
        expect.stringContaining("lookup.php?i=52772"),
      ]),
    );
  });
  it("handles empty and failing catalog responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ meals: null })),
        ),
    );
    expect(
      await searchOnlineRecipes(
        "not-a-recipe",
        "Обед",
        new AbortController().signal,
      ),
    ).toEqual([]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    await expect(
      searchOnlineRecipes("rice", "Обед", new AbortController().signal),
    ).rejects.toThrow(/недоступен/);
  });
  it("loads old backups and merges independent saved recipes between devices", () => {
    const { savedRecipes, ...legacy } = structuredClone(initialState);
    expect(parseImport(JSON.stringify(legacy)).savedRecipes).toEqual([]);
    const base = structuredClone(initialState),
      a = structuredClone(base),
      b = structuredClone(base);
    a.savedRecipes = [normalizeMeal(meal, "Обед")!];
    b.savedRecipes = [
      normalizeMeal(
        { ...meal, idMeal: "52773", strMeal: "Other dish" },
        "Ужин",
      )!,
    ];
    const result = mergeWorkspaces(base, a, b);
    expect(result.conflicts).toEqual([]);
    expect(result.data.savedRecipes).toHaveLength(2);
    expect(parseImport(JSON.stringify(result.data))).toEqual(result.data);
  });
});
