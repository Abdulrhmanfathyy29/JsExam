import { CONFIG } from '../config.js';
import { Meal, MealNutrition } from '../types.js';
import { ApiService } from '../services/api.js';
import { NutritionService } from '../services/nutrition.js';
import { StorageService } from '../services/storage.js';
import { UI } from '../ui.js';

/**
 * RecipePage
 * The page of one recipe: the big picture, the ingredients with their
 * checkboxes, the steps, the video and the nutrition facts.
 * It also opens the window to log the recipe in the Food Log.
 */
export class RecipePage {
  api: ApiService;
  storage: StorageService;
  nutritionService: NutritionService;
  ui: UI;
  onMealLogged: () => void;
  goBack: () => void;

  meal: Meal = null;
  nutrition: MealNutrition = null;

  section = document.getElementById('recipe-detail-modal');

  constructor(
    api: ApiService,
    storage: StorageService,
    nutritionService: NutritionService,
    ui: UI,
    onMealLogged: () => void,
    goBack: () => void
  ) {
    this.api = api;
    this.storage = storage;
    this.nutritionService = nutritionService;
    this.ui = ui;
    this.onMealLogged = onMealLogged;
    this.goBack = goBack;

    // The Escape key closes the recipe
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.section.style.display !== 'none') {
        this.close();
      }
    });
  }

  /** Open the page of one recipe. */
  async showMeal(mealId: string) {
    this.section.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Most of the time the recipe is already in the cache (we clicked its card)
    let meal = this.api.getMealFromCache(mealId);

    if (!meal) {
      this.section.innerHTML = this.getLoadingHtml();
      meal = await this.api.getMealById(mealId);
    }

    if (!meal) {
      this.showNotFound(mealId);
      return;
    }

    this.meal = meal;
    this.nutrition = await this.nutritionService.getMealNutrition(meal);
    this.show();
  }

  /** Close the recipe and go back to the list. */
  close() {
    this.section.style.display = 'none';
    this.goBack();
  }

  getLoadingHtml() {
    return `
      <div class="max-w-7xl mx-auto py-6">
        <div class="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm animate-pulse space-y-6">
          <div class="h-6 bg-gray-200 rounded w-32"></div>
          <div class="h-72 bg-gray-200 rounded-2xl"></div>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-8 h-80 bg-gray-100 rounded-2xl"></div>
            <div class="lg:col-span-4 h-80 bg-gray-100 rounded-2xl"></div>
          </div>
        </div>
      </div>
    `;
  }

  showNotFound(mealId: string) {
    this.section.innerHTML = `
      <div class="max-w-xl mx-auto py-16 text-center">
        <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Recipe Not Found</h2>
        <p class="text-xs text-gray-500 mb-6">Unable to load recipe details for ID #${mealId}.</p>
        <button id="detail-error-back-btn" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-xs hover:bg-emerald-700 transition-all">
          Back to Recipes
        </button>
      </div>
    `;

    document.getElementById('detail-error-back-btn').addEventListener('click', () => this.close());
  }

  /** Build the whole recipe page. */
  show() {
    const meal = this.meal;
    const perServing = this.nutrition.perServing;

    const name = meal.name || meal.strMeal || 'Recipe Details';
    const category = meal.category || meal.strCategory || 'General';
    const thumbnail = meal.thumbnail || meal.strMealThumb || '';
    const source = meal.source || meal.strSource || '';

    const ingredients = this.nutritionService.getIngredients(meal);
    const steps = this.nutritionService.getSteps(meal);
    const videoUrl = this.getVideoUrl(meal.youtube || meal.strYoutube || '');

    const totalCalories = (perServing.calories || 0) * this.nutrition.servings;

    // The ingredients, one line with a checkbox for each of them
    let ingredientsHtml = '';
    for (let i = 0; i < ingredients.length; i++) {
      const item = ingredients[i];
      const measure = item.measure ? `<span class="font-bold text-gray-900">${item.measure}</span> ` : '';

      ingredientsHtml += `
        <label class="ingredient-item bg-gray-50/70 hover:bg-gray-100/70 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors border border-transparent">
          <input type="checkbox" id="ing-check-${i}" class="w-4 h-4 rounded border-gray-300 text-emerald-600 accent-emerald-600 focus:ring-0 cursor-pointer" />
          <span class="text-xs truncate">
            ${measure}<span class="text-gray-700 font-normal">${item.ingredient}</span>
          </span>
        </label>
      `;
    }

    // The steps, with their number in a green circle
    let stepsHtml = '';
    for (let i = 0; i < steps.length; i++) {
      stepsHtml += `
        <div class="flex items-start gap-3.5">
          <div class="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            ${i + 1}
          </div>
          <p class="text-xs sm:text-sm text-gray-700 leading-relaxed pt-0.5">
            ${steps[i]}
          </p>
        </div>
      `;
    }

    const picture = thumbnail
      ? `<img src="${thumbnail}" alt="${name}" class="w-full h-full object-cover" />`
      : '<div class="w-full h-full bg-gray-800 flex items-center justify-center"><i class="fa-solid fa-utensils text-gray-600 text-5xl"></i></div>';

    // The video card, only if the recipe has a video
    let videoHtml = '';
    if (videoUrl) {
      videoHtml = `
        <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
          <h3 class="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-video text-rose-500 text-sm"></i>
            <span>Video Tutorial</span>
          </h3>

          <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-900 shadow-xs">
            <iframe
              src="${videoUrl}"
              title="${name} Video Tutorial"
              class="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
    }

    // The link to the original recipe, only if the API sends one
    let sourceHtml = '';
    if (source) {
      sourceHtml = `
        <div class="pt-4 mt-4 border-t border-gray-100">
          <a href="${source}" target="_blank" rel="noopener" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors">
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            <span>View Original Recipe</span>
          </a>
        </div>
      `;
    }

    this.section.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">

        <!-- The back link -->
        <div>
          <button id="back-to-recipes-btn" class="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-700 font-semibold text-xs transition-colors cursor-pointer">
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Recipes</span>
          </button>
        </div>

        <!-- 1. The big picture with the title -->
        <div class="relative h-72 sm:h-80 rounded-3xl overflow-hidden bg-gray-900 shadow-sm group">
          ${picture}
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>

          <div class="absolute bottom-6 left-6 right-6 text-white">
            <span class="inline-block px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg mb-2 shadow-xs">
              ${category}
            </span>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2.5 drop-shadow-xs">
              ${name}
            </h1>
            <div class="flex flex-wrap items-center gap-5 text-xs font-semibold text-white/90">
              <span class="flex items-center gap-1.5"><i class="fa-regular fa-clock text-white/80"></i> ${CONFIG.DEFAULT_COOKING_TIME_MIN} min</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-utensils text-white/80"></i> ${this.nutrition.servings} servings</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-fire text-orange-400"></i> ${perServing.calories || 0} cal/serving</span>
            </div>
          </div>
        </div>

        <!-- 2. The log button -->
        <div>
          <button id="open-log-meal-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-clipboard-list text-sm"></i>
            <span>Log This Meal</span>
          </button>
        </div>

        <!-- 3. The two columns -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <!-- Left: the ingredients, the steps and the video -->
          <div class="lg:col-span-8 space-y-6">

            <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <i class="fa-solid fa-bars-staggered text-emerald-600"></i>
                  <span>Ingredients</span>
                </h3>
                <span class="text-xs text-gray-400 font-semibold">${ingredients.length} items</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="ingredients-checkboxes-grid">
                ${ingredientsHtml}
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
              <h3 class="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <i class="fa-solid fa-shoe-prints text-emerald-600"></i>
                <span>Instructions</span>
              </h3>

              <div class="space-y-4">
                ${stepsHtml}
              </div>
            </div>

            ${videoHtml}

          </div>

          <!-- Right: the nutrition facts -->
          <div class="lg:col-span-4 space-y-6">

            <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
              <h3 class="text-base font-bold text-gray-900 flex items-center gap-2 mb-0.5">
                <i class="fa-solid fa-chart-pie text-emerald-600"></i>
                <span>Nutrition Facts</span>
              </h3>
              <p class="text-xs text-gray-400 mb-4">Per serving</p>

              <div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 text-center mb-5">
                <p class="text-xs font-medium text-gray-500 mb-1">Calories per serving</p>
                <p class="text-3xl font-black text-emerald-600 tracking-tight mb-0.5">${perServing.calories || 0}</p>
                <p class="text-[11px] text-gray-400">Total: ${totalCalories} cal</p>
              </div>

              <!-- One bar for each nutrient -->
              <div class="space-y-3.5 text-xs">
                ${this.createNutrientBar('Protein', perServing.protein, this.nutrition.dailyValues.protein, 'emerald')}
                ${this.createNutrientBar('Carbs', perServing.carbs, this.nutrition.dailyValues.carbs, 'blue')}
                ${this.createNutrientBar('Fat', perServing.fat, this.nutrition.dailyValues.fat, 'purple')}
                ${this.createNutrientBar('Fiber', perServing.fiber, this.nutrition.dailyValues.fiber, 'orange')}
                ${this.createNutrientBar('Sugar', perServing.sugar, this.nutrition.dailyValues.sugar, 'pink')}
                ${this.createNutrientBar('Saturated Fat', perServing.saturatedFat, this.nutrition.dailyValues.saturatedFat, 'red')}
              </div>

              <div class="pt-4 mt-4 border-t border-gray-100">
                <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Other</p>
                <div class="flex justify-between text-xs text-gray-600 font-medium">
                  <span>Cholesterol <strong class="text-gray-900">${perServing.cholesterol || 0}mg</strong></span>
                  <span>Sodium <strong class="text-gray-900">${perServing.sodium || 0}mg</strong></span>
                </div>
              </div>

              ${sourceHtml}

            </div>

          </div>

        </div>

      </div>
    `;

    this.addEventListeners();
  }

  /**
   * One line "Protein ... 32g" with its bar.
   * The bar is full when one serving covers the whole day.
   */
  createNutrientBar(label: string, grams: number, percent: number, color: string) {
    const width = Math.min(percent || 0, 100);

    return `
      <div>
        <div class="flex justify-between items-center mb-1 font-semibold">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-${color}-500"></span><span class="text-gray-700">${label}</span></span>
          <span class="text-gray-900 font-bold">${grams || 0}g</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div class="bg-${color}-500 h-1.5 rounded-full" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }

  addEventListeners() {
    document.getElementById('back-to-recipes-btn').addEventListener('click', () => this.close());
    document.getElementById('open-log-meal-btn').addEventListener('click', () => this.openLogModal());

    // When we check an ingredient, a line is drawn on its text
    this.section.querySelectorAll('.ingredient-item input').forEach((element) => {
      const checkbox = element as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        const text = checkbox.closest('.ingredient-item').querySelector('span');
        if (checkbox.checked) {
          text.classList.add('line-through', 'opacity-60');
        } else {
          text.classList.remove('line-through', 'opacity-60');
        }
      });
    });
  }

  /**
   * The window where the user chooses how many servings he ate.
   * When he confirms, the recipe goes in the Food Log.
   */
  openLogModal() {
    const meal = this.meal;
    const perServing = this.nutrition.perServing;
    const name = meal.name || meal.strMeal || 'Meal';
    const thumbnail = meal.thumbnail || meal.strMealThumb || '';

    const picture = thumbnail
      ? `<img src="${thumbnail}" alt="${name}" class="w-12 h-12 rounded-2xl object-cover shrink-0 border border-gray-200 shadow-xs" />`
      : '<div class="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400"><i class="fa-solid fa-utensils"></i></div>';

    const modal = document.createElement('div');
    modal.id = 'log-meal-modal';
    modal.className = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in';

    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all animate-scale-up">
        <div class="flex items-center gap-3.5 mb-5">
          ${picture}
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-bold text-gray-900 leading-tight">Log This Meal</h3>
            <p class="text-xs text-gray-400 font-normal mt-0.5 truncate">${name}</p>
          </div>
        </div>

        <!-- The number of servings -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-700 mb-2">Number of Servings</label>
          <div class="flex items-center gap-2.5">
            <button id="servings-dec-btn" class="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center transition-colors cursor-pointer text-sm">
              <i class="fa-solid fa-minus text-xs"></i>
            </button>
            <input type="number" id="servings-input" value="1" min="0.5" max="10" step="0.5" class="w-16 h-9 text-center text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none" />
            <button id="servings-inc-btn" class="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center transition-colors cursor-pointer text-sm">
              <i class="fa-solid fa-plus text-xs"></i>
            </button>
          </div>
        </div>

        <!-- These numbers change when the servings change -->
        <div class="bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4 my-4">
          <p class="text-[11px] text-gray-500 mb-2.5 font-medium">Estimated nutrition per serving:</p>
          <div class="grid grid-cols-4 gap-2 text-center">
            <div>
              <p class="text-base font-extrabold text-emerald-600 leading-tight" id="dialog-calories">${perServing.calories || 0}</p>
              <p class="text-[10px] text-gray-400 font-medium">Calories</p>
            </div>
            <div>
              <p class="text-base font-extrabold text-blue-600 leading-tight" id="dialog-protein">${perServing.protein || 0}g</p>
              <p class="text-[10px] text-gray-400 font-medium">Protein</p>
            </div>
            <div>
              <p class="text-base font-extrabold text-amber-500 leading-tight" id="dialog-carbs">${perServing.carbs || 0}g</p>
              <p class="text-[10px] text-gray-400 font-medium">Carbs</p>
            </div>
            <div>
              <p class="text-base font-extrabold text-purple-600 leading-tight" id="dialog-fat">${perServing.fat || 0}g</p>
              <p class="text-[10px] text-gray-400 font-medium">Fat</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3 pt-1">
          <button id="cancel-log-btn" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer">
            Cancel
          </button>
          <button id="confirm-log-btn" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-clipboard-check text-xs"></i>
            <span>Log Meal</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#servings-input') as HTMLInputElement;

    // The servings go from 0.5 to 10, half by half
    const changeServings = (value: number) => {
      const servings = Math.max(0.5, Math.min(10, Math.round(value * 2) / 2));
      input.value = String(servings);

      const total = this.nutritionService.scaleByServings(perServing, servings);
      modal.querySelector('#dialog-calories').textContent = String(total.calories);
      modal.querySelector('#dialog-protein').textContent = total.protein + 'g';
      modal.querySelector('#dialog-carbs').textContent = total.carbs + 'g';
      modal.querySelector('#dialog-fat').textContent = total.fat + 'g';
    };

    modal.querySelector('#servings-dec-btn').addEventListener('click', () => changeServings(Number(input.value) - 0.5));
    modal.querySelector('#servings-inc-btn').addEventListener('click', () => changeServings(Number(input.value) + 0.5));
    input.addEventListener('change', () => changeServings(Number(input.value)));

    const closeModal = () => modal.remove();
    modal.querySelector('#cancel-log-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      // We close only if the click is outside the white box
      if (event.target === modal) {
        closeModal();
      }
    });

    modal.querySelector('#confirm-log-btn').addEventListener('click', async () => {
      const servings = Number(input.value) || 1;
      const total = this.nutritionService.scaleByServings(perServing, servings);
      const servingsText = servings + ' serving' + (servings !== 1 ? 's' : '');

      this.storage.logItem({
        type: 'meal',
        name: name,
        thumbnail: thumbnail,
        servings: servings,
        portionText: servingsText,
        nutrition: total
      });

      closeModal();

      await Swal.fire({
        title: 'Meal Logged!',
        html: `
          <p class="text-xs text-gray-500 mb-2">${name} (${servingsText}) has been added to your daily log.</p>
          <p class="text-sm font-bold text-emerald-600">+${total.calories} calories</p>
        `,
        icon: 'success',
        iconColor: '#10b981',
        showConfirmButton: false,
        timer: 1800,
        customClass: {
          popup: 'rounded-3xl p-6 sm:p-7 shadow-2xl',
          title: 'text-xl font-bold text-gray-900',
          htmlContainer: 'text-xs text-gray-500'
        }
      });

      this.ui.showToast(name + ' logged to your daily intake! 📝');
      this.onMealLogged();
    });
  }

  /** Turn a normal YouTube link into a link we can put in an iframe. */
  getVideoUrl(url: string) {
    if (!url) {
      return '';
    }

    // We take the 11 letters of the video id in the link
    const found = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (!found) {
      return '';
    }

    return 'https://www.youtube.com/embed/' + found[1];
  }
}
