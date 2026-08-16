import { CONFIG } from '../config.js';
import { Meal, Category, Product } from '../types.js';

/**
 * ApiService
 * This class does all the calls to the API.
 * It also keeps the answers in a small cache, so we do not ask twice
 * for the same thing.
 */
export class ApiService {
  cache: any = {};

  /**
   * Does the fetch, adds the API key and stops the request if it is too slow.
   */
  async request(url: string, options: any = {}) {
    if (!url.startsWith('http')) {
      url = CONFIG.API_BASE_URL + url;
    }

    // AbortController lets us cancel a request that takes too long
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    const headers: any = {
      Accept: 'application/json',
      'x-api-key': CONFIG.API_KEY
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        body: options.body,
        headers: headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error('The API answered with the error ' + response.status);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('The request to ' + url + ' took too long.');
      }
      throw error;
    }
  }

  // ==================== MEALS ====================

  /**
   * The first list of recipes shown on the home page.
   */
  async getRandomMeals() {
    const key = 'random_meals';
    if (this.cache[key]) {
      return this.cache[key];
    }

    try {
      const data = await this.request('/meals/random?count=' + CONFIG.MEALS_PER_PAGE);
      const meals: Meal[] = data.results || [];
      if (meals.length > 0) {
        this.cache[key] = meals;
      }
      return meals;
    } catch (error) {
      console.warn('Random meals did not work, we try the search instead:', error);
      return this.searchMeals('');
    }
  }

  /**
   * Search the recipes by name.
   */
  async searchMeals(query: string) {
    try {
      const data = await this.request('/meals/search?q=' + encodeURIComponent(query));
      return data.results || [];
    } catch (error) {
      console.error('Could not search the recipes:', error);
      return [];
    }
  }

  /**
   * Filter the recipes by category and / or by cuisine.
   */
  async filterMeals(category: string, area: string) {
    let url = '/meals/filter?limit=' + CONFIG.MEALS_PER_PAGE;
    if (category) {
      url = url + '&category=' + encodeURIComponent(category);
    }
    if (area) {
      url = url + '&area=' + encodeURIComponent(area);
    }

    try {
      const data = await this.request(url);
      return data.results || [];
    } catch (error) {
      console.error('Could not filter the recipes:', error);
      return [];
    }
  }

  /**
   * One recipe with all its details.
   * If our API does not find it, we try the free TheMealDB API.
   */
  async getMealById(id: string) {
    if (this.cache['meal_' + id]) {
      return this.cache['meal_' + id];
    }

    // 1) our API
    try {
      const data = await this.request('/meals/' + id);
      const meal: Meal = data.result;
      if (meal && (meal.instructions || meal.ingredients)) {
        this.saveMealInCache(id, meal);
        return meal;
      }
    } catch (error) {
      console.warn('The recipe ' + id + ' is not on the main API, we try the backup:', error);
    }

    // 2) TheMealDB, it only works with a number
    if (/^\d+$/.test(id)) {
      const meal = await this.getMealFromMealDb('/lookup.php?i=' + id);
      if (meal) {
        this.saveMealInCache(id, meal);
        return meal;
      }
    }

    // 3) our API again, but searching the name (the id can be a name like "beef-pie")
    const name = id.replace(/-/g, ' ');
    const results: Meal[] = await this.searchMeals(name);
    if (results.length > 0) {
      this.saveMealInCache(id, results[0]);
      return results[0];
    }

    // 4) last try: search the name on TheMealDB
    const backup = await this.getMealFromMealDb('/search.php?s=' + encodeURIComponent(name));
    if (backup) {
      this.saveMealInCache(id, backup);
      return backup;
    }

    return null;
  }

  /**
   * Call to the free TheMealDB API (it does not need a key).
   */
  async getMealFromMealDb(path: string) {
    try {
      const response = await fetch(CONFIG.THEMEALDB_BASE_URL + path);
      const data = await response.json();
      if (data.meals) {
        return data.meals[0];
      }
    } catch (error) {
      console.warn('The backup API did not answer:', error);
    }
    return null;
  }

  /** We save the recipes we already have, the details page opens faster. */
  saveMealInCache(id: string, meal: Meal) {
    this.cache['meal_' + id] = meal;
  }

  getMealFromCache(id: string) {
    return this.cache['meal_' + id];
  }

  /**
   * The list of the categories (Beef, Chicken, Dessert...).
   */
  async getMealCategories() {
    if (this.cache.meal_categories) {
      return this.cache.meal_categories;
    }

    try {
      const data = await this.request('/meals/categories');
      const categories: Category[] = data.results || [];
      if (categories.length > 0) {
        this.cache.meal_categories = categories;
      }
      return categories;
    } catch (error) {
      console.error('Could not load the categories:', error);
      return [];
    }
  }

  /**
   * The list of the cuisines (Italian, Japanese...).
   */
  async getMealAreas() {
    if (this.cache.meal_areas) {
      return this.cache.meal_areas;
    }

    try {
      const data = await this.request('/meals/areas');
      const areas: Category[] = data.results || [];
      if (areas.length > 0) {
        this.cache.meal_areas = areas;
      }
      return areas;
    } catch (error) {
      console.error('Could not load the cuisines:', error);
      return [];
    }
  }

  // ==================== NUTRITION ====================

  /**
   * Ask the API to calculate the nutrition of a recipe from its ingredients.
   * This endpoint answers with an error about once every four calls, so we
   * try it 3 times. We return null if it really does not work, and then the
   * app shows an estimation.
   */
  async analyzeRecipeNutrition(recipeName: string, ingredients: string[]) {
    const key = 'nutrition_' + recipeName;
    if (this.cache[key]) {
      return this.cache[key];
    }

    const body = JSON.stringify({ recipeName: recipeName, ingredients: ingredients });

    for (let i = 1; i <= CONFIG.NUTRITION_MAX_TRIES; i++) {
      try {
        const answer = await this.request('/nutrition/analyze', { method: 'POST', body: body });
        if (answer.success && answer.data) {
          this.cache[key] = answer.data;
          return answer.data;
        }
      } catch (error: any) {
        console.warn('Try number ' + i + ' of the nutrition analysis failed:', error.message);
      }

      // We wait a little before trying again
      if (i < CONFIG.NUTRITION_MAX_TRIES) {
        await new Promise((resolve) => setTimeout(resolve, CONFIG.NUTRITION_RETRY_DELAY_MS));
      }
    }

    return null;
  }

  // ==================== PRODUCTS ====================

  /**
   * Search the packaged products by name.
   */
  async searchProducts(query: string) {
    try {
      const data = await this.request(
        '/products/search?q=' + encodeURIComponent(query) + '&page=1&limit=' + CONFIG.PRODUCTS_PER_PAGE
      );
      return data.results || [];
    } catch (error) {
      console.error('Could not search the products:', error);
      return [];
    }
  }

  /**
   * Find one product with its barcode.
   */
  async getProductByBarcode(barcode: string) {
    if (this.cache['product_' + barcode]) {
      return this.cache['product_' + barcode];
    }

    try {
      const data = await this.request('/products/barcode/' + encodeURIComponent(barcode));
      let product: Product = data.result;
      if (product) {
        // Our API does not send the ingredients, we take them from OpenFoodFacts
        product = await this.addIngredientsAndAllergens(product);
        this.cache['product_' + barcode] = product;
      }
      return product;
    } catch (error) {
      console.error('Could not load the product ' + barcode + ':', error);
      // Our API failed, so we read the product directly on OpenFoodFacts
      return this.getProductFromOpenFoodFacts(barcode);
    }
  }

  /**
   * Read one product on OpenFoodFacts.
   */
  async getOpenFoodFactsProduct(barcode: string) {
    try {
      const url = CONFIG.OPENFOODFACTS_BASE_URL + '/product/' + encodeURIComponent(barcode) + '.json';
      const response = await fetch(url);
      const data = await response.json();
      return data.product;
    } catch (error) {
      console.warn('OpenFoodFacts did not answer:', error);
      return null;
    }
  }

  /**
   * Build a product with only OpenFoodFacts (used when our API is down).
   */
  async getProductFromOpenFoodFacts(barcode: string) {
    const found = await this.getOpenFoodFactsProduct(barcode);
    if (!found) {
      return null;
    }

    const values = found.nutriments || {};

    const product: Product = {
      barcode: barcode,
      name: found.product_name || 'Packaged Product',
      brand: found.brands || '',
      image: found.image_url || found.image_front_url || '',
      nutritionGrade: found.nutrition_grades || 'e',
      novaGroup: found.nova_group || 4,
      ingredients_text: found.ingredients_text_fr || found.ingredients_text_en || found.ingredients_text || '',
      allergens: found.allergens_from_ingredients || found.allergens || '',
      nutrients: {
        calories: values['energy-kcal_100g'] || 0,
        protein: values.proteins_100g || 0,
        carbs: values.carbohydrates_100g || 0,
        fat: values.fat_100g || 0,
        sugar: values.sugars_100g || 0,
        saturatedFat: values['saturated-fat_100g'] || 0,
        fiber: values.fiber_100g || 0,
        salt: values.salt_100g || 0
      }
    };
    return product;
  }

  /**
   * Add the ingredients and the allergens to a product, because our API
   * does not send them.
   */
  async addIngredientsAndAllergens(product: Product) {
    if (!product.barcode || product.ingredients_text) {
      return product;
    }

    const found = await this.getOpenFoodFactsProduct(product.barcode);
    if (!found) {
      return product;
    }

    product.ingredients_text =
      found.ingredients_text_fr || found.ingredients_text_en || found.ingredients_text || '';
    product.allergens = found.allergens_from_ingredients || found.allergens || '';

    // Our API does not always send the sugar, the fiber and the salt
    const nutrients = product.nutrients || {};
    const values = found.nutriments;
    if (values && !nutrients.sugar) {
      product.nutrients = {
        calories: nutrients.calories || values['energy-kcal_100g'] || 0,
        protein: nutrients.protein || values.proteins_100g || 0,
        carbs: nutrients.carbs || values.carbohydrates_100g || 0,
        fat: nutrients.fat || values.fat_100g || 0,
        sugar: values.sugars_100g || 0,
        saturatedFat: values['saturated-fat_100g'] || 0,
        fiber: values.fiber_100g || 0,
        salt: values.salt_100g || 0
      };
    }

    return product;
  }

  /**
   * The categories shown as pills on the scanner page.
   */
  async getProductCategories() {
    if (this.cache.product_categories) {
      return this.cache.product_categories;
    }

    try {
      const data = await this.request('/products/categories?page=1&limit=' + CONFIG.PRODUCTS_PER_PAGE);
      const categories: Category[] = data.results || [];
      if (categories.length > 0) {
        this.cache.product_categories = categories;
      }
      return categories;
    } catch (error) {
      console.error('Could not load the product categories:', error);
      return [];
    }
  }

  /**
   * All the products of one category.
   */
  async getProductsByCategory(category: string) {
    try {
      const data = await this.request(
        '/products/category/' + encodeURIComponent(category) + '?page=1&limit=' + CONFIG.PRODUCTS_PER_PAGE
      );
      return data.results || [];
    } catch (error) {
      console.error('Could not load the products of ' + category + ':', error);
      return [];
    }
  }
}
