// All the settings of the app are here, so we never write a URL
// or a fixed number in the middle of the code.
export const CONFIG = {
    API_BASE_URL: 'https://nutriplan-api.vercel.app/api',
    API_KEY: 'xRGnhxcXrKuX8hJpeeQE5Rac9b7dyQDpaMs5fWFL',
    THEMEALDB_BASE_URL: 'https://www.themealdb.com/api/json/v1/1',
    OPENFOODFACTS_BASE_URL: 'https://world.openfoodfacts.org/api/v0',
    // Default daily targets of the Food Log page
    DEFAULT_DAILY_GOALS: {
        calories: 2000,
        protein: 140, // grams
        carbs: 225, // grams
        fat: 65 // grams
    },
    // Values used to calculate the percentages of the nutrition bars
    DAILY_REFERENCE: {
        protein: 50,
        carbs: 300,
        fat: 65,
        fiber: 25,
        sugar: 50,
        saturatedFat: 20
    },
    MEALS_PER_PAGE: 25,
    PRODUCTS_PER_PAGE: 24,
    // What the scanner searches before the user types something
    DEFAULT_PRODUCT_QUERY: 'healthy',
    // The meals API does not send a cooking time, so we show this one
    DEFAULT_COOKING_TIME_MIN: 30,
    REQUEST_TIMEOUT_MS: 12000,
    // The /nutrition/analyze endpoint answers with an error from time to time
    NUTRITION_MAX_TRIES: 3,
    NUTRITION_RETRY_DELAY_MS: 500,
    // How long we wait after the last key pressed before calling the API
    SEARCH_DELAY_MS: 300,
    PRODUCT_SEARCH_DELAY_MS: 400
};
//# sourceMappingURL=config.js.map