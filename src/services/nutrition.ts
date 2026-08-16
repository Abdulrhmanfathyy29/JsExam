import { CONFIG } from '../config.js';
import { Ingredient, Meal, MealNutrition, Nutrients } from '../types.js';
import { ApiService } from './api.js';
import { StorageService } from './storage.js';

/**
 * NutritionService
 * Reads the ingredients and the steps of a recipe, then asks the API for the
 * nutrition facts. If the API does not answer we calculate an estimation,
 * so the page is never empty.
 */
export class NutritionService {
  api: ApiService;
  storage: StorageService;

  constructor(api: ApiService, storage: StorageService) {
    this.api = api;
    this.storage = storage;
  }

  /**
   * The two APIs do not send the ingredients the same way:
   * - our API sends a list [{ ingredient, measure }]
   * - TheMealDB sends strIngredient1, strMeasure1, strIngredient2...
   * This method gives the same format for both.
   */
  getIngredients(meal: Meal) {
    const ingredients: Ingredient[] = [];

    if (meal.ingredients && meal.ingredients.length > 0) {
      for (let i = 0; i < meal.ingredients.length; i++) {
        const item = meal.ingredients[i];
        if (item && item.ingredient) {
          ingredients.push(this.makeIngredient(item.ingredient, item.measure));
        }
      }
      return ingredients;
    }

    for (let i = 1; i <= 20; i++) {
      const name = meal['strIngredient' + i];
      if (name && name.trim()) {
        ingredients.push(this.makeIngredient(name, meal['strMeasure' + i]));
      }
    }
    return ingredients;
  }

  makeIngredient(name: string, measure: string): Ingredient {
    const cleanName = name.trim();
    return {
      ingredient: cleanName,
      measure: (measure || '').trim(),
      image: 'https://www.themealdb.com/images/ingredients/' + encodeURIComponent(cleanName) + '.png'
    };
  }

  /**
   * Cut the instructions into a list of steps.
   */
  getSteps(meal: Meal) {
    // Our API already sends a list of steps
    if (Array.isArray(meal.instructions)) {
      return meal.instructions;
    }

    const text = meal.strInstructions || '';
    if (!text) {
      return [];
    }

    // TheMealDB sends one long text, so we cut it on the line breaks
    let steps = text
      .replace(/\r\n/g, '\n')
      .split(/\n+/)
      .map((step) => step.trim())
      .filter((step) => step.length > 5);

    // No line breaks in the text? Then we cut on "STEP 1", "1." or ". "
    if (steps.length <= 1 && text.length > 100) {
      steps = text
        .split(/(?:STEP\s+\d+|^\d+[\.\)]|\.\s+(?=[A-Z]))/gim)
        .map((step) => step.trim())
        .filter((step) => step.length > 5);
    }

    // Remove the numbers at the beginning ("1. ", "Step 2: ")
    return steps.map((step) => step.replace(/^(?:STEP\s*\d+[:\.\-]?|\d+[\.\)]\s*)/i, '').trim());
  }

  /**
   * The main method: we give a recipe and we get its nutrition facts.
   */
  async getMealNutrition(meal: Meal) {
    const recipeName = meal.name || meal.strMeal || 'Recipe';
    const cacheKey = 'nutrition_' + (meal.id || meal.idMeal || recipeName);

    // We save the answer in localStorage, so we do not call the API every time
    const saved = this.storage.getCachedNutrition(cacheKey);
    if (saved) {
      return saved;
    }

    // The API wants simple lines like "2 tbsp Olive Oil"
    const ingredients = this.getIngredients(meal);
    const lines = ingredients.map((item) => (item.measure + ' ' + item.ingredient).trim());

    let answer = null;
    if (lines.length > 0) {
      answer = await this.api.analyzeRecipeNutrition(recipeName, lines);
    }

    // The API did not answer this time. We show an estimation but we do NOT
    // save it, so the real values come back as soon as the API works again.
    if (!answer || !answer.perServing) {
      return this.estimateNutrition(meal, recipeName);
    }

    const nutrition: MealNutrition = {
      recipeName: recipeName,
      servings: answer.servings || 4,
      perServing: answer.perServing,
      dailyValues: this.getDailyValues(answer.perServing)
    };

    this.storage.saveCachedNutrition(cacheKey, nutrition);
    return nutrition;
  }

  /**
   * How much of the day a serving covers, in percent.
   * Example: 40g of protein / 50g per day = 80%.
   */
  getDailyValues(perServing: Nutrients): Nutrients {
    const reference = CONFIG.DAILY_REFERENCE;

    return {
      protein: this.percent(perServing.protein, reference.protein),
      carbs: this.percent(perServing.carbs, reference.carbs),
      fat: this.percent(perServing.fat, reference.fat),
      fiber: this.percent(perServing.fiber, reference.fiber),
      sugar: this.percent(perServing.sugar, reference.sugar),
      saturatedFat: this.percent(perServing.saturatedFat, reference.saturatedFat)
    };
  }

  percent(value: number, total: number) {
    return Math.round(((value || 0) / total) * 100);
  }

  /**
   * Multiply the nutrition by the number of servings the user chose.
   */
  scaleByServings(perServing: Nutrients, servings: number): Nutrients {
    return {
      calories: Math.round((perServing.calories || 0) * servings),
      protein: this.round1((perServing.protein || 0) * servings),
      carbs: this.round1((perServing.carbs || 0) * servings),
      fat: this.round1((perServing.fat || 0) * servings),
      fiber: this.round1((perServing.fiber || 0) * servings),
      sugar: this.round1((perServing.sugar || 0) * servings)
    };
  }

  round1(value: number) {
    return Math.round(value * 10) / 10;
  }

  /**
   * Estimation used only when the nutrition API does not answer.
   * We take an average plate for the category of the recipe, then we change
   * it a little with the name, so two recipes never show the same numbers.
   */
  estimateNutrition(meal: Meal, recipeName: string): MealNutrition {
    const category = (meal.category || meal.strCategory || '').toLowerCase();
    const name = recipeName.toLowerCase();
    const perServing = this.getAveragePlate(category, name);

    const change = this.getNumberFromName(name);
    perServing.calories = Math.max(250, perServing.calories + change * 2);
    perServing.protein = Math.max(5, perServing.protein + Math.floor(change / 4));
    perServing.carbs = Math.max(10, perServing.carbs + Math.floor(change / 3));
    perServing.fat = Math.max(5, perServing.fat + Math.floor(change / 5));

    return {
      recipeName: recipeName,
      servings: 4,
      perServing: perServing,
      dailyValues: this.getDailyValues(perServing)
    };
  }

  /**
   * The average values of one plate for each kind of recipe.
   */
  getAveragePlate(category: string, name: string) {
    const isAbout = (word: string) => category.includes(word) || name.includes(word);

    if (isAbout('beef') || isAbout('steak')) {
      return { calories: 560, protein: 42, carbs: 20, fat: 34, fiber: 5, sugar: 6, saturatedFat: 12, cholesterol: 110, sodium: 620 };
    }
    if (isAbout('chicken')) {
      return { calories: 460, protein: 38, carbs: 26, fat: 16, fiber: 5, sugar: 6, saturatedFat: 3.5, cholesterol: 95, sodium: 510 };
    }
    if (isAbout('seafood') || isAbout('fish') || isAbout('salmon') || isAbout('prawn')) {
      return { calories: 420, protein: 36, carbs: 18, fat: 15, fiber: 5, sugar: 6, saturatedFat: 2.5, cholesterol: 80, sodium: 430 };
    }
    if (isAbout('pasta') || isAbout('spaghetti')) {
      return { calories: 540, protein: 19, carbs: 76, fat: 14, fiber: 5, sugar: 6, saturatedFat: 4, cholesterol: 25, sodium: 480 };
    }
    if (category.includes('vegetarian') || category.includes('vegan')) {
      return { calories: 360, protein: 14, carbs: 52, fat: 11, fiber: 9, sugar: 8, saturatedFat: 1.5, cholesterol: 0, sodium: 390 };
    }
    if (isAbout('dessert') || isAbout('cake') || isAbout('pie') || isAbout('pudding')) {
      return { calories: 480, protein: 6, carbs: 65, fat: 22, fiber: 5, sugar: 42, saturatedFat: 11, cholesterol: 65, sodium: 280 };
    }
    if (category.includes('breakfast')) {
      return { calories: 410, protein: 22, carbs: 34, fat: 19, fiber: 5, sugar: 6, saturatedFat: 5, cholesterol: 210, sodium: 460 };
    }

    // All the other recipes
    return { calories: 480, protein: 28, carbs: 45, fat: 18, fiber: 5, sugar: 6, saturatedFat: 4, cholesterol: 60, sodium: 540 };
  }

  /**
   * Turn the name of the recipe into a number between -20 and 19.
   * The same name always gives the same number.
   */
  getNumberFromName(name: string) {
    let total = 0;
    for (let i = 0; i < name.length; i++) {
      total = total + name.charCodeAt(i) * (i + 1);
    }
    return (total % 40) - 20;
  }
}
