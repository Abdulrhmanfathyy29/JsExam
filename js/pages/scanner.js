import { CONFIG } from '../config.js';
// The colour and the icon of every category pill
const CATEGORY_STYLES = {
    'breakfast-cereals': { bg: 'bg-amber-500', icon: 'fa-bowl-rice' },
    beverages: { bg: 'bg-sky-500', icon: 'fa-bottle-water' },
    snacks: { bg: 'bg-fuchsia-500', icon: 'fa-cookie-bite' },
    dairies: { bg: 'bg-blue-500', icon: 'fa-cheese' },
    cheeses: { bg: 'bg-yellow-500', icon: 'fa-cheese' },
    yogurts: { bg: 'bg-indigo-400', icon: 'fa-bowl-food' },
    chocolates: { bg: 'bg-amber-700', icon: 'fa-cubes-stacked' },
    biscuits: { bg: 'bg-orange-400', icon: 'fa-cookie' },
    breads: { bg: 'bg-amber-600', icon: 'fa-bread-slice' },
    fruits: { bg: 'bg-rose-500', icon: 'fa-apple-whole' },
    vegetables: { bg: 'bg-emerald-600', icon: 'fa-carrot' },
    meats: { bg: 'bg-red-600', icon: 'fa-drumstick-bite' },
    fishes: { bg: 'bg-teal-500', icon: 'fa-fish' },
    'plant-based-foods': { bg: 'bg-green-600', icon: 'fa-leaf' },
    'chips-and-fries': { bg: 'bg-yellow-600', icon: 'fa-fire-burner' }
};
// What every Nutri-Score letter means, shown in the product window.
// Many products were never rated: the API sends "unknown" for them, and then
// we must not show a letter, because we do not know the quality.
const NUTRI_SCORES = {
    A: { bg: 'bg-emerald-600', text: 'Good quality', cardBg: 'bg-emerald-50 border-emerald-200' },
    B: { bg: 'bg-lime-500', text: 'Decent quality', cardBg: 'bg-lime-50 border-lime-200' },
    C: { bg: 'bg-yellow-500', text: 'Average quality', cardBg: 'bg-yellow-50 border-yellow-200' },
    D: { bg: 'bg-orange-500', text: 'Poor quality', cardBg: 'bg-orange-50 border-orange-200' },
    E: { bg: 'bg-rose-600', text: 'Bad', cardBg: 'bg-rose-50 border-rose-200' },
    UNKNOWN: { bg: 'bg-slate-400', text: 'Not rated', cardBg: 'bg-slate-50 border-slate-200' }
};
// What every NOVA group means
const NOVA_LABELS = {
    1: 'Unprocessed',
    2: 'Culinary ingredient',
    3: 'Processed',
    4: 'Ultra-processed'
};
// The style of the Nutri-Score filter buttons
const FILTER_ALL_ON = 'nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-200/80 text-gray-800 shadow-xs';
const FILTER_LETTER_ON = 'nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 text-white shadow-xs';
const FILTER_OFF = 'nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-100 text-gray-700 hover:bg-gray-200';
/**
 * ScannerPage
 * The scanner page: search a product by name or by barcode, filter by
 * Nutri-Score, browse the categories and open the details of a product.
 */
export class ScannerPage {
    constructor(api, storage, ui, onProductLogged) {
        this.products = [];
        this.categories = [];
        this.selectedCategory = '';
        this.selectedGrade = '';
        this.searchText = '';
        this.section = document.getElementById('products-section');
        this.api = api;
        this.storage = storage;
        this.ui = ui;
        this.onProductLogged = onProductLogged;
    }
    /** Build the page. It runs every time the user opens the scanner. */
    async load() {
        this.showLayout();
        // Now the page exists, so we can take its elements
        this.grid = document.getElementById('products-grid-container');
        this.statusText = document.getElementById('products-status-count');
        this.searchInput = document.getElementById('product-search-input');
        this.barcodeInput = document.getElementById('barcode-search-input');
        this.addEventListeners();
        await this.loadCategories();
    }
    /** The HTML of the scanner page (this section is empty in index.html). */
    showLayout() {
        this.section.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">

        <!-- 1. The green banner with the two search boxes -->
        <div class="bg-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-sm">
          <div class="flex items-center gap-2.5 mb-1.5">
            <i class="fa-solid fa-barcode text-2xl"></i>
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight">Product Search & Barcode Scanner</h2>
          </div>
          <p class="text-white/90 text-xs sm:text-sm mb-6 font-normal">
            Search for packaged food products to view nutrition information
          </p>

          <!-- Search by name -->
          <div class="flex gap-2.5 mb-4">
            <div class="relative flex-1">
              <input
                type="text"
                id="product-search-input"
                placeholder="Search by product name (e.g., Cheerios, Nutella, Coca-Cola...)"
                class="w-full pl-4 pr-10 py-3.5 bg-white text-gray-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none placeholder:text-gray-400 shadow-xs"
              />
              <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
            </div>
            <button id="search-product-submit-btn" class="px-6 py-3.5 bg-white hover:bg-gray-50 text-emerald-700 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs shrink-0 cursor-pointer">
              Search
            </button>
          </div>

          <div class="relative flex items-center justify-center my-4">
            <div class="border-t border-white/25 w-full"></div>
            <span class="bg-emerald-600 px-3 text-xs text-white/80 font-medium absolute">or</span>
          </div>

          <!-- Search by barcode -->
          <div class="flex gap-2.5">
            <div class="relative flex-1">
              <input
                type="text"
                id="barcode-search-input"
                placeholder="Enter barcode number (e.g., 7613034626844)"
                class="w-full pl-4 pr-10 py-3.5 bg-white text-gray-900 rounded-xl text-xs sm:text-sm font-medium focus:outline-none placeholder:text-gray-400 shadow-xs"
              />
              <i class="fa-solid fa-barcode absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
            </div>
            <button id="barcode-lookup-btn" class="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-2 cursor-pointer">
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
              <span>Lookup</span>
            </button>
          </div>
        </div>

        <!-- 2. The Nutri-Score filter -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-semibold text-gray-500 mr-1">Filter by Nutri-Score:</span>
          <div class="flex items-center gap-1.5" id="nutri-score-filter-group">
            <button class="${FILTER_ALL_ON}" data-grade="">All</button>
            <button class="nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-100 text-emerald-800 hover:bg-emerald-200" data-grade="a">A</button>
            <button class="nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-lime-100 text-lime-800 hover:bg-lime-200" data-grade="b">B</button>
            <button class="nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-yellow-100 text-yellow-800 hover:bg-yellow-200" data-grade="c">C</button>
            <button class="nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-orange-100 text-orange-800 hover:bg-orange-200" data-grade="d">D</button>
            <button class="nutri-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-rose-100 text-rose-800 hover:bg-rose-200" data-grade="e">E</button>
          </div>
        </div>

        <!-- 3. The categories -->
        <div>
          <h3 class="text-sm font-bold text-gray-900 mb-3">Browse by Category</h3>
          <div class="flex items-center gap-2.5 overflow-x-auto pb-2 category-scroll-container" id="product-categories-container">
            <!-- filled with the categories of the API -->
          </div>
        </div>

        <!-- 4. The number of results -->
        <p id="products-status-count" class="text-xs text-gray-500 font-medium">Search for products to see results</p>

        <!-- 5. The products -->
        <div id="products-grid-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          ${this.getEmptyHtml()}
        </div>

      </div>
    `;
    }
    getEmptyHtml() {
        return `
      <div class="col-span-full py-20 text-center">
        <div class="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
          <i class="fa-solid fa-box-open"></i>
        </div>
        <h4 class="text-sm font-bold text-gray-800 mb-1">No products to display</h4>
        <p class="text-xs text-gray-400">Search for a product or browse by category</p>
      </div>
    `;
    }
    addEventListeners() {
        // We wait 400ms after the last letter before calling the API
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                this.searchText = this.searchInput.value.trim();
                if (this.searchText) {
                    this.loadProducts();
                }
                else if (!this.selectedCategory) {
                    // The box is empty again, so we clear the results
                    this.products = [];
                    this.showProducts();
                }
            }, CONFIG.PRODUCT_SEARCH_DELAY_MS);
        });
        const startSearch = () => {
            this.searchText = this.searchInput.value.trim();
            this.loadProducts();
        };
        this.searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                startSearch();
            }
        });
        document.getElementById('search-product-submit-btn').addEventListener('click', startSearch);
        // The barcode search
        const startLookup = () => {
            const barcode = this.barcodeInput.value.trim();
            if (barcode) {
                this.lookupBarcode(barcode);
            }
            else {
                this.ui.showToast('Please enter a barcode number');
            }
        };
        this.barcodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                startLookup();
            }
        });
        document.getElementById('barcode-lookup-btn').addEventListener('click', startLookup);
        // The Nutri-Score buttons work on the products we already have
        const filterGroup = document.getElementById('nutri-score-filter-group');
        filterGroup.querySelectorAll('.nutri-btn').forEach((element) => {
            const button = element;
            button.addEventListener('click', () => {
                this.selectedGrade = button.dataset.grade;
                // All the buttons go grey, then we colour the one we clicked
                filterGroup.querySelectorAll('.nutri-btn').forEach((other) => {
                    other.className = FILTER_OFF;
                });
                button.className = this.selectedGrade ? FILTER_LETTER_ON : FILTER_ALL_ON;
                this.showProducts();
            });
        });
        // One listener on the grid for all the product cards
        this.grid.addEventListener('click', (event) => {
            const target = event.target;
            const card = target.closest('.product-card');
            if (!card) {
                return;
            }
            const product = this.products.find((item) => item.barcode === card.dataset.barcode);
            if (product) {
                this.openProductModal(product);
            }
        });
    }
    // ---------- the categories ----------
    async loadCategories() {
        this.categories = await this.api.getProductCategories();
        let html = '';
        for (let i = 0; i < this.categories.length; i++) {
            const category = this.categories[i];
            const style = CATEGORY_STYLES[category.id] || { bg: 'bg-emerald-600', icon: 'fa-utensils' };
            html += `
        <button class="prod-cat-pill shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${style.bg} text-white hover:opacity-90" data-cat="${category.id}">
          <i class="fa-solid ${style.icon}"></i>
          <span>${category.name}</span>
        </button>
      `;
        }
        const list = document.getElementById('product-categories-container');
        list.innerHTML = html;
        list.querySelectorAll('.prod-cat-pill').forEach((element) => {
            const button = element;
            button.addEventListener('click', () => {
                const id = button.dataset.cat;
                const wasSelected = this.selectedCategory === id;
                this.selectedCategory = wasSelected ? '' : id;
                // Only the selected pill keeps the ring around it
                list.querySelectorAll('.prod-cat-pill').forEach((other) => {
                    other.classList.remove('ring-2', 'ring-emerald-600', 'ring-offset-2', 'scale-105', 'shadow-md');
                });
                if (!wasSelected) {
                    button.classList.add('ring-2', 'ring-emerald-600', 'ring-offset-2', 'scale-105', 'shadow-md');
                }
                this.loadProducts();
            });
        });
    }
    // ---------- the products ----------
    /** Ask the API for the products. */
    async loadProducts() {
        this.grid.innerHTML = this.ui.getProductSkeletons(8);
        this.statusText.textContent = 'Searching products...';
        if (this.selectedCategory) {
            this.products = await this.api.getProductsByCategory(this.selectedCategory);
        }
        else if (this.searchText) {
            this.products = await this.api.searchProducts(this.searchText);
        }
        else {
            this.products = await this.api.searchProducts(CONFIG.DEFAULT_PRODUCT_QUERY);
        }
        this.showProducts();
    }
    /** Search one single product with its barcode. */
    async lookupBarcode(barcode) {
        this.grid.innerHTML = this.ui.getProductSkeletons(4);
        this.statusText.textContent = 'Looking up barcode ' + barcode + '...';
        const product = await this.api.getProductByBarcode(barcode);
        if (product) {
            this.products = [product];
            this.showProducts();
            this.openProductModal(product);
            return;
        }
        this.products = [];
        this.statusText.textContent = '0 products found';
        this.grid.innerHTML = `
      <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-gray-200 p-8">
        <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
          <i class="fa-solid fa-barcode"></i>
        </div>
        <h3 class="text-base font-bold text-gray-900 mb-1">Barcode Not Found</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto">
          No product matched barcode "${barcode}". Try checking the barcode or searching by product name.
        </p>
      </div>
    `;
    }
    /** Show the products, keeping only the Nutri-Score the user selected. */
    showProducts() {
        let products = this.products;
        if (this.selectedGrade) {
            products = products.filter((product) => product.nutritionGrade === this.selectedGrade);
        }
        if (products.length > 0) {
            const forText = this.searchText ? ' for "' + this.searchText + '"' : '';
            const s = products.length !== 1 ? 's' : '';
            this.statusText.textContent = 'Found ' + products.length + ' product' + s + forText;
        }
        else if (!this.searchText && !this.selectedCategory) {
            this.statusText.textContent = 'Search for products to see results';
        }
        else {
            this.statusText.textContent = '0 products found';
        }
        if (products.length === 0) {
            this.grid.innerHTML = this.getEmptyHtml();
            return;
        }
        let html = '';
        for (let i = 0; i < products.length; i++) {
            html += this.createProductCard(products[i]);
        }
        this.grid.innerHTML = html;
    }
    /** The HTML of one product card. */
    createProductCard(product) {
        const name = product.name || 'Packaged Product';
        const brand = product.brand || '';
        const nutrients = product.nutrients || {};
        // The API rarely sends the weight of the pack, we show it only when it does
        const quantityHtml = product.quantity
            ? `<span><i class="fa-solid fa-bottle-water text-gray-400 mr-1 text-[11px]"></i> ${product.quantity}</span>`
            : '';
        const calories = Math.round(nutrients.calories || 0);
        const protein = this.round1(nutrients.protein);
        const carbs = this.round1(nutrients.carbs);
        const fat = this.round1(nutrients.fat);
        const sugar = this.round1(nutrients.sugar);
        const picture = product.image
            ? `<img src="${product.image}" alt="${name}" loading="lazy" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />`
            : `<div class="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-2xl">
           <i class="fa-solid fa-box-archive"></i>
         </div>`;
        const novaBadge = product.novaGroup
            ? `<div class="absolute top-2.5 right-2.5">${this.ui.getNovaBadge(product.novaGroup)}</div>`
            : '';
        const brandLine = brand ? `<p class="text-xs font-semibold text-emerald-600 truncate mb-1">${brand}</p>` : '';
        return `
      <div class="product-card bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group" data-barcode="${product.barcode}">

        <!-- The picture with the two badges -->
        <div class="relative h-44 bg-gray-50 flex items-center justify-center p-3 overflow-hidden">
          ${picture}

          <div class="absolute top-2.5 left-2.5">
            ${this.ui.getNutriScoreBadge(product.nutritionGrade)}
          </div>

          ${novaBadge}
        </div>

        <!-- The text of the card -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            ${brandLine}
            <h3 class="text-sm font-bold text-gray-900 line-clamp-1 mb-1.5 group-hover:text-emerald-600 transition-colors" title="${name}">
              ${name}
            </h3>

            <div class="flex items-center gap-3 text-xs text-gray-500 font-medium mb-3">
              ${quantityHtml}
              <span><i class="fa-solid fa-fire text-orange-400 mr-1 text-[11px]"></i> ${calories} kcal/100g</span>
            </div>
          </div>

          <!-- The four macros -->
          <div class="grid grid-cols-4 gap-1.5 text-center pt-1">
            <div class="bg-emerald-50 rounded-xl p-1.5">
              <span class="font-bold text-emerald-600 block text-[11px]">${protein}g</span>
              <span class="text-gray-400 block text-[9px]">Protein</span>
            </div>
            <div class="bg-blue-50 rounded-xl p-1.5">
              <span class="font-bold text-blue-600 block text-[11px]">${carbs}g</span>
              <span class="text-gray-400 block text-[9px]">Carbs</span>
            </div>
            <div class="bg-purple-50 rounded-xl p-1.5">
              <span class="font-bold text-purple-600 block text-[11px]">${fat}g</span>
              <span class="text-gray-400 block text-[9px]">Fat</span>
            </div>
            <div class="bg-amber-50 rounded-xl p-1.5">
              <span class="font-bold text-amber-500 block text-[11px]">${sugar}g</span>
              <span class="text-gray-400 block text-[9px]">Sugar</span>
            </div>
          </div>
        </div>

      </div>
    `;
    }
    /** The big window with all the details of one product. */
    async openProductModal(product) {
        // Get the ingredients and the allergens if our API did not send them
        if (!product.ingredients_text && product.barcode) {
            product = await this.api.addIngredientsAndAllergens(product);
        }
        const name = product.name || 'Product Details';
        const brand = product.brand || '';
        const nutrients = product.nutrients || {};
        // If the product has no Nutri-Score we show a grey "?" instead of a letter
        let grade = (product.nutritionGrade || 'unknown').toUpperCase();
        if (!NUTRI_SCORES[grade]) {
            grade = 'UNKNOWN';
        }
        const score = NUTRI_SCORES[grade];
        const scoreLetter = grade === 'UNKNOWN' ? '?' : grade;
        const calories = Math.round(nutrients.calories || 0);
        const protein = this.round1(nutrients.protein);
        const carbs = this.round1(nutrients.carbs);
        const fat = this.round1(nutrients.fat);
        const sugar = this.round1(nutrients.sugar);
        const saturatedFat = this.round1(nutrients.saturatedFat);
        const fiber = this.round1(nutrients.fiber);
        // OpenFoodFacts sends the sodium, and 1g of sodium is about 2.5g of salt
        const salt = Math.round((nutrients.salt || (nutrients.sodium || 0) * 2.5) * 100) / 100;
        // The NOVA box is shown only when the API really sends the group,
        // if not we would say "Ultra-processed" about a product we do not know
        let novaHtml = '';
        if (product.novaGroup) {
            novaHtml = `
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-rose-50 border-rose-200">
          <span class="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
            ${product.novaGroup}
          </span>
          <div class="text-[10px] leading-tight">
            <span class="font-bold text-gray-900 block">NOVA</span>
            <span class="text-gray-500 font-medium">${NOVA_LABELS[product.novaGroup]}</span>
          </div>
        </div>
      `;
        }
        const picture = product.image
            ? `<img src="${product.image}" alt="${name}" class="w-full h-full object-contain" />`
            : '<i class="fa-solid fa-box-archive text-gray-300 text-3xl"></i>';
        // The allergens box, only if the product has some
        const allergens = this.cleanAllergens(product.allergens);
        let allergensHtml = '';
        if (allergens) {
            allergensHtml = `
        <div class="bg-rose-50/90 border border-rose-100 rounded-2xl p-4 mb-5 text-xs">
          <h4 class="font-bold text-rose-700 mb-1 flex items-center gap-1.5">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Allergens</span>
          </h4>
          <p class="text-rose-600 font-medium">${allergens}</p>
        </div>
      `;
        }
        const modal = document.createElement('div');
        modal.id = 'product-detail-modal';
        modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in';
        modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-gray-100 transform transition-all max-h-[90vh] overflow-y-auto relative">

        <button id="modal-close-x-btn" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer text-sm">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- The picture, the name and the two badges -->
        <div class="flex items-start gap-4 mb-6">
          <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2 shrink-0 border border-gray-100 flex items-center justify-center shadow-xs">
            ${picture}
          </div>
          <div class="flex-1 min-w-0 pr-6">
            <span class="text-xs font-semibold text-emerald-600 truncate block mb-1">${brand}</span>
            <h3 class="text-2xl font-black text-gray-900 leading-tight mb-2.5 truncate">${name}</h3>

            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border ${score.cardBg}">
                <span class="w-6 h-6 rounded-lg ${score.bg} text-white font-black text-xs flex items-center justify-center uppercase shadow-xs">
                  ${scoreLetter}
                </span>
                <div class="text-[10px] leading-tight">
                  <span class="font-bold text-gray-900 block">Nutri-Score</span>
                  <span class="text-gray-500 font-medium">${score.text}</span>
                </div>
              </div>

              ${novaHtml}
            </div>
          </div>
        </div>

        <!-- The nutrition for 100g -->
        <div class="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 mb-5 shadow-xs">
          <div class="flex items-center gap-2 text-xs font-bold text-gray-800 mb-3">
            <i class="fa-solid fa-chart-pie text-emerald-600"></i>
            <span>Nutrition Facts <span class="text-gray-400 font-normal">(per 100g)</span></span>
          </div>

          <div class="text-center mb-3">
            <p class="text-4xl font-black text-gray-900 tracking-tight leading-none mb-1">${calories}</p>
            <p class="text-xs text-gray-400 font-medium">Calories</p>
          </div>

          <div class="border-t border-emerald-200/80 mb-4"></div>

          <div class="grid grid-cols-4 gap-2 text-center mb-4">
            ${this.createMacroColumn('Protein', protein, 'emerald')}
            ${this.createMacroColumn('Carbs', carbs, 'blue')}
            ${this.createMacroColumn('Fat', fat, 'purple')}
            ${this.createMacroColumn('Sugar', sugar, 'orange')}
          </div>

          <div class="grid grid-cols-3 gap-2 text-center pt-3 border-t border-emerald-200/60 text-xs">
            <div>
              <p class="font-bold text-gray-900 text-xs">${saturatedFat}g</p>
              <p class="text-[10px] text-gray-400">Saturated Fat</p>
            </div>
            <div>
              <p class="font-bold text-gray-900 text-xs">${fiber}g</p>
              <p class="text-[10px] text-gray-400">Fiber</p>
            </div>
            <div>
              <p class="font-bold text-gray-900 text-xs">${salt}g</p>
              <p class="text-[10px] text-gray-400">Salt</p>
            </div>
          </div>
        </div>

        <!-- The ingredients -->
        <div class="bg-white rounded-2xl p-4 border border-gray-100 mb-4 shadow-xs">
          <h4 class="text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-2">
            <i class="fa-solid fa-list-ul text-gray-500 text-xs"></i>
            <span>Ingredients</span>
          </h4>
          <p class="text-xs text-gray-600 leading-relaxed">${product.ingredients_text || ''}</p>
        </div>

        ${allergensHtml}

        <div class="flex gap-3 pt-1">
          <button id="confirm-log-prod-btn" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Log This Food</span>
          </button>
          <button id="close-prod-modal-btn" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer">
            Close
          </button>
        </div>

      </div>
    `;
        document.body.appendChild(modal);
        const closeModal = () => modal.remove();
        modal.querySelector('#close-prod-modal-btn').addEventListener('click', closeModal);
        modal.querySelector('#modal-close-x-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            // We close only if the click is outside the white box
            if (event.target === modal) {
                closeModal();
            }
        });
        modal.querySelector('#confirm-log-prod-btn').addEventListener('click', () => {
            this.storage.logItem({
                type: 'product',
                name: name,
                brand: brand,
                barcode: product.barcode,
                thumbnail: product.image,
                portionText: '100g',
                nutrition: { calories: calories, protein: protein, carbs: carbs, fat: fat }
            });
            closeModal();
            this.ui.showToast(name + ' logged to your daily intake! 🥑');
            this.onProductLogged();
        });
    }
    /**
     * One macro with its bar. The values are for 100g, so a product with
     * 25g of fat fills 25% of the bar.
     */
    createMacroColumn(label, grams, color) {
        let percent = 0;
        if (grams > 0) {
            // We always show a little bit of colour, and never more than 100%
            percent = Math.min(Math.max(Math.round(grams), 4), 100);
        }
        return `
      <div>
        <div class="w-full bg-gray-200/80 rounded-full h-1.5 overflow-hidden mb-1.5">
          <div class="h-1.5 bg-${color}-500 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
        </div>
        <p class="text-sm font-black text-gray-900">${grams}g</p>
        <p class="text-[10px] text-gray-400 font-medium">${label}</p>
      </div>
    `;
    }
    /** The allergens come as "en:milk,en:nuts", we make them readable. */
    cleanAllergens(allergens) {
        if (!allergens) {
            return '';
        }
        if (Array.isArray(allergens)) {
            allergens = allergens.join(', ');
        }
        return allergens.replace(/en:/g, '').replace(/_/g, ' ');
    }
    round1(value) {
        return Math.round((value || 0) * 10) / 10;
    }
}
//# sourceMappingURL=scanner.js.map