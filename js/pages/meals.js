import { CONFIG } from '../config.js';
// The colours and the icon of every category card.
// A category that is not in this list gets the green style below.
const CATEGORY_THEMES = {
    Beef: { icon: 'fa-drumstick-bite', bg: 'bg-rose-50', border: 'border-rose-200', iconBg: 'bg-rose-500' },
    Chicken: { icon: 'fa-drumstick-bite', bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-500' },
    Dessert: { icon: 'fa-cake-candles', bg: 'bg-pink-50', border: 'border-pink-200', iconBg: 'bg-pink-500' },
    Lamb: { icon: 'fa-bone', bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-500' },
    Miscellaneous: { icon: 'fa-bowl-rice', bg: 'bg-slate-50', border: 'border-slate-200', iconBg: 'bg-slate-500' },
    Pasta: { icon: 'fa-plate-wheat', bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-500' },
    Pork: { icon: 'fa-bacon', bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-500' },
    Seafood: { icon: 'fa-fish', bg: 'bg-sky-50', border: 'border-sky-200', iconBg: 'bg-sky-500' },
    Side: { icon: 'fa-bowl-food', bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-500' },
    Starter: { icon: 'fa-utensils', bg: 'bg-teal-50', border: 'border-teal-200', iconBg: 'bg-teal-500' },
    Vegan: { icon: 'fa-leaf', bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-500' },
    Vegetarian: { icon: 'fa-seedling', bg: 'bg-lime-50', border: 'border-lime-200', iconBg: 'bg-lime-500' },
    Breakfast: { icon: 'fa-egg', bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-500' },
    Goat: { icon: 'fa-bone', bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-500' }
};
const DEFAULT_THEME = {
    icon: 'fa-utensils',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-600'
};
/**
 * MealsPage
 * The home page: the search bar, the cuisine pills, the category cards and
 * the recipe cards. Everything comes from the API.
 */
export class MealsPage {
    constructor(api, ui, openMeal) {
        this.meals = [];
        this.categories = [];
        this.areas = [];
        // What the user selected
        this.selectedCategory = '';
        this.selectedArea = '';
        this.searchText = '';
        this.viewMode = 'grid';
        // The elements of index.html
        this.grid = document.getElementById('recipes-grid');
        this.categoriesGrid = document.getElementById('categories-cards-grid');
        this.cuisinesBar = document.getElementById('cuisines-pills-container');
        this.searchInput = document.getElementById('recipe-search-input');
        this.countText = document.getElementById('recipes-count-text');
        this.gridViewBtn = document.getElementById('grid-view-btn');
        this.listViewBtn = document.getElementById('list-view-btn');
        this.viewAllBtn = document.getElementById('view-all-categories-btn');
        this.api = api;
        this.ui = ui;
        this.openMeal = openMeal;
        this.addEventListeners();
    }
    addEventListeners() {
        // We wait 300ms after the last letter before calling the API,
        // if not we send one request for every letter typed
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                this.searchText = this.searchInput.value.trim();
                this.loadMeals();
            }, CONFIG.SEARCH_DELAY_MS);
        });
        this.gridViewBtn.addEventListener('click', () => this.changeView('grid'));
        this.listViewBtn.addEventListener('click', () => this.changeView('list'));
        // "View All" removes the selected category
        this.viewAllBtn.addEventListener('click', () => {
            this.selectedCategory = '';
            this.showCategories();
            this.loadMeals();
        });
        // One listener on the grid for all the cards
        this.grid.addEventListener('click', (event) => {
            const target = event.target;
            const card = target.closest('.recipe-card');
            if (card) {
                this.openMeal(card.dataset.id);
            }
        });
    }
    /** Load the three parts of the page at the same time. */
    async load() {
        await Promise.all([this.loadCategories(), this.loadAreas(), this.loadMeals()]);
    }
    // ---------- the categories ----------
    async loadCategories() {
        this.categories = await this.api.getMealCategories();
        this.showCategories();
    }
    showCategories() {
        let html = '';
        for (let i = 0; i < this.categories.length; i++) {
            const name = this.categories[i].name;
            const theme = CATEGORY_THEMES[name] || DEFAULT_THEME;
            const isSelected = this.selectedCategory === name;
            const selectedStyle = isSelected
                ? 'ring-2 ring-emerald-600 shadow-md scale-[1.02]'
                : 'hover:shadow-sm hover:scale-[1.01]';
            html += `
        <button
          class="category-card flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${theme.bg} ${theme.border} ${selectedStyle}"
          data-category="${name}">
          <div class="w-9 h-9 rounded-xl ${theme.iconBg} text-white flex items-center justify-center shrink-0 shadow-xs text-sm">
            <i class="fa-solid ${theme.icon}"></i>
          </div>
          <span class="text-sm font-bold text-gray-900 truncate group-hover:opacity-90">
            ${name}
          </span>
        </button>
      `;
        }
        this.categoriesGrid.innerHTML = html;
        // Click on a card = select it, click again = unselect it
        this.categoriesGrid.querySelectorAll('.category-card').forEach((element) => {
            const button = element;
            button.addEventListener('click', () => {
                const name = button.dataset.category;
                if (this.selectedCategory === name) {
                    this.selectedCategory = '';
                }
                else {
                    this.selectedCategory = name;
                }
                this.showCategories();
                this.loadMeals();
            });
        });
    }
    // ---------- the cuisines ----------
    async loadAreas() {
        this.areas = await this.api.getMealAreas();
        this.showAreas();
    }
    showAreas() {
        // The first pill is "All Cuisines", then one pill for every cuisine
        const names = [''];
        for (let i = 0; i < this.areas.length; i++) {
            names.push(this.areas[i].name);
        }
        let html = '';
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const isSelected = this.selectedArea === name;
            const style = isSelected ? 'bg-emerald-700 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            html += `
        <button class="cuisine-pill px-4 py-2 rounded-full font-medium text-xs whitespace-nowrap transition-all ${style}" data-area="${name}">
          ${name || 'All Cuisines'}
        </button>
      `;
        }
        this.cuisinesBar.innerHTML = html;
        this.cuisinesBar.querySelectorAll('.cuisine-pill').forEach((element) => {
            const button = element;
            button.addEventListener('click', () => {
                this.selectedArea = button.dataset.area;
                this.showAreas();
                this.loadMeals();
            });
        });
    }
    // ---------- the recipes ----------
    /** Ask the API for the recipes, using what the user selected. */
    async loadMeals() {
        this.grid.innerHTML = this.ui.getRecipeSkeletons(8);
        this.countText.textContent = 'Loading recipes...';
        if (this.searchText) {
            // The search endpoint does not accept the filters,
            // so we remove the recipes that do not match ourselves
            let results = await this.api.searchMeals(this.searchText);
            if (this.selectedCategory) {
                results = results.filter((meal) => meal.category === this.selectedCategory);
            }
            if (this.selectedArea) {
                results = results.filter((meal) => meal.area === this.selectedArea);
            }
            this.meals = results;
        }
        else if (this.selectedCategory || this.selectedArea) {
            this.meals = await this.api.filterMeals(this.selectedCategory, this.selectedArea);
        }
        else {
            this.meals = await this.api.getRandomMeals();
        }
        // We put the recipes in the cache, the details page opens instantly
        for (let i = 0; i < this.meals.length; i++) {
            const meal = this.meals[i];
            if (meal.id) {
                this.api.saveMealInCache(meal.id, meal);
            }
        }
        this.showMeals();
    }
    showMeals() {
        const categoryName = this.selectedCategory ? this.selectedCategory + ' ' : '';
        this.countText.textContent = 'Showing ' + this.meals.length + ' ' + categoryName + 'recipes';
        if (this.meals.length === 0) {
            this.showNoResults();
            return;
        }
        if (this.viewMode === 'grid') {
            this.grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5';
        }
        else {
            this.grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-5';
        }
        let html = '';
        for (let i = 0; i < this.meals.length; i++) {
            html += this.createMealCard(this.meals[i]);
        }
        this.grid.innerHTML = html;
    }
    /** Message shown when no recipe matches the filters. */
    showNoResults() {
        this.grid.innerHTML = `
      <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-gray-200 p-8">
        <div class="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-1">No recipes found</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto mb-4">
          No recipes matched your criteria. Try selecting another cuisine or category.
        </p>
        <button id="reset-filter-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs">
          Show All Recipes
        </button>
      </div>
    `;
        document.getElementById('reset-filter-btn').addEventListener('click', () => {
            this.selectedCategory = '';
            this.selectedArea = '';
            this.searchText = '';
            this.searchInput.value = '';
            this.showCategories();
            this.showAreas();
            this.loadMeals();
        });
    }
    /** The HTML of one recipe card. */
    createMealCard(meal) {
        const name = meal.name || 'Recipe';
        const category = meal.category || 'General';
        const area = meal.area || 'International';
        const thumbnail = meal.thumbnail || '';
        // The first step of the recipe, shown under the title
        let description = '';
        if (Array.isArray(meal.instructions) && meal.instructions.length > 0) {
            description = meal.instructions[0];
        }
        const noImage = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><i class="fa-solid fa-utensils text-gray-300"></i></div>';
        // The list view: a small picture on the left, the text on the right
        if (this.viewMode === 'list') {
            const image = thumbnail
                ? `<img src="${thumbnail}" alt="${name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />`
                : noImage;
            return `
        <div class="recipe-card bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center gap-4 cursor-pointer group" data-id="${meal.id}">
          <div class="w-36 sm:w-44 h-28 sm:h-32 rounded-xl overflow-hidden shrink-0 bg-gray-100">
            ${image}
          </div>
          <div class="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
            <div>
              <h3 class="text-sm font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors" title="${name}">${name}</h3>
              <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">${description}</p>
            </div>
            <div class="flex items-center justify-between text-xs font-semibold pt-2 border-t border-gray-100">
              <span class="text-emerald-700 flex items-center gap-1.5"><i class="fa-solid fa-utensils text-emerald-600 text-[11px]"></i> <span>${category}</span></span>
              <span class="text-blue-600 flex items-center gap-1.5"><i class="fa-solid fa-globe text-blue-500 text-[11px]"></i> <span>${area}</span></span>
            </div>
          </div>
        </div>
      `;
        }
        // The grid view: the picture on top, the text under it
        const image = thumbnail
            ? `<img src="${thumbnail}" alt="${name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />`
            : '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><i class="fa-solid fa-utensils text-gray-300 text-3xl"></i></div>';
        return `
      <div class="recipe-card bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer group" data-id="${meal.id}">
        <!-- The picture with the two labels on it -->
        <div class="relative h-44 bg-gray-100 overflow-hidden">
          ${image}

          <div class="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span class="bg-white/95 text-gray-900 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <i class="fa-solid fa-tag text-emerald-600 text-[10px]"></i>
              <span>${category}</span>
            </span>
            <span class="bg-white/95 text-gray-900 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <i class="fa-solid fa-globe text-blue-500 text-[10px]"></i>
              <span>${area}</span>
            </span>
          </div>
        </div>

        <!-- The text of the card -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-900 mb-1.5 line-clamp-1 group-hover:text-emerald-600 transition-colors" title="${name}">
              ${name}
            </h3>
            <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
              ${description}
            </p>
          </div>

          <div class="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
            <span class="text-emerald-700 flex items-center gap-1">
              <i class="fa-solid fa-utensils text-emerald-600 text-[11px]"></i>
              <span>${category}</span>
            </span>
            <span class="text-blue-600 flex items-center gap-1">
              <i class="fa-solid fa-globe text-blue-500 text-[11px]"></i>
              <span>${area}</span>
            </span>
          </div>
        </div>
      </div>
    `;
    }
    /** Switch between the grid view and the list view. */
    changeView(mode) {
        this.viewMode = mode;
        const activeStyle = 'px-3 py-1.5 bg-white rounded-md shadow-xs text-gray-800 font-semibold';
        const normalStyle = 'px-3 py-1.5 text-gray-500 hover:text-gray-800';
        this.gridViewBtn.className = mode === 'grid' ? activeStyle : normalStyle;
        this.listViewBtn.className = mode === 'list' ? activeStyle : normalStyle;
        this.showMeals();
    }
}
//# sourceMappingURL=meals.js.map