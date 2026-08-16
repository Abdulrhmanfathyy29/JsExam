import { ApiService } from './services/api.js';
import { StorageService } from './services/storage.js';
import { NutritionService } from './services/nutrition.js';
import { UI } from './ui.js';
import { Router } from './router.js';
import { MealsPage } from './pages/meals.js';
import { RecipePage } from './pages/recipe.js';
import { ScannerPage } from './pages/scanner.js';
import { FoodLogPage } from './pages/foodlog.js';
/**
 * App
 * The main class of the project. It creates the services and the pages,
 * shows the right page when the URL changes, and opens or closes the
 * sidebar on small screens.
 */
class App {
    constructor() {
        // The services, they are shared by all the pages
        this.api = new ApiService();
        this.storage = new StorageService();
        this.ui = new UI();
        this.nutrition = new NutritionService(this.api, this.storage);
        // The four <section> of index.html that the pages fill
        this.mealsSection = document.getElementById('meals-view-container');
        this.recipeSection = document.getElementById('recipe-detail-modal');
        this.scannerSection = document.getElementById('products-section');
        this.foodLogSection = document.getElementById('foodlog-section');
        this.headerTitle = document.getElementById('header-title');
        this.headerSubtitle = document.getElementById('header-subtitle');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.menuBtn = document.getElementById('header-menu-btn');
        this.closeSidebarBtn = document.getElementById('sidebar-close-btn');
        this.mealsPage = new MealsPage(this.api, this.ui, (mealId) => this.router.goTo('meal/' + mealId));
        this.recipePage = new RecipePage(this.api, this.storage, this.nutrition, this.ui, () => this.foodLogPage.show(), () => this.router.goTo('meals'));
        this.scannerPage = new ScannerPage(this.api, this.storage, this.ui, () => this.foodLogPage.show());
        this.foodLogPage = new FoodLogPage(this.storage, this.ui, () => this.router.goTo('meals'), () => this.router.goTo('scanner'));
        this.setupSidebar();
        // The router opens the first page, so we create it at the end
        this.router = new Router({
            meals: () => this.showMeals(),
            meal: (mealId) => this.showRecipe(mealId),
            scanner: () => this.showScanner(),
            foodlog: () => this.showFoodLog()
        });
    }
    /** Open and close the sidebar on the phone and the tablet. */
    setupSidebar() {
        const openSidebar = () => {
            this.sidebar.classList.add('open');
            this.sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // the page behind cannot scroll
        };
        const closeSidebar = () => {
            this.sidebar.classList.remove('open');
            this.sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        };
        this.menuBtn.addEventListener('click', openSidebar);
        this.closeSidebarBtn.addEventListener('click', closeSidebar);
        this.sidebarOverlay.addEventListener('click', closeSidebar);
        // A click on a link changes the page and closes the sidebar
        this.sidebar.querySelectorAll('nav a[data-route]').forEach((element) => {
            const link = element;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                this.router.goTo(link.dataset.route);
                if (window.innerWidth <= 1024) {
                    closeSidebar();
                }
            });
        });
    }
    /** Show one section and hide the three others. */
    showOnly(section) {
        this.mealsSection.style.display = section === this.mealsSection ? 'block' : 'none';
        this.recipeSection.style.display = section === this.recipeSection ? 'block' : 'none';
        this.scannerSection.style.display = section === this.scannerSection ? 'block' : 'none';
        this.foodLogSection.style.display = section === this.foodLogSection ? 'block' : 'none';
    }
    /** Change the title and the subtitle at the top of the page. */
    setHeader(title, subtitle) {
        this.headerTitle.textContent = title;
        this.headerSubtitle.textContent = subtitle;
        document.title = title + ' | NutriPlan';
    }
    showMeals() {
        this.showOnly(this.mealsSection);
        this.setHeader('Meals & Recipes', 'Discover delicious and nutritious recipes tailored for you');
        window.scrollTo(0, 0);
        // We only load the recipes the first time
        if (this.mealsPage.meals.length === 0) {
            this.mealsPage.load();
        }
    }
    showRecipe(mealId) {
        this.showOnly(this.recipeSection);
        this.setHeader('Recipe Details', 'View full recipe information and nutrition facts');
        this.recipePage.showMeal(mealId);
    }
    showScanner() {
        this.showOnly(this.scannerSection);
        this.setHeader('Product Scanner', 'Search packaged foods by name or barcode');
        window.scrollTo(0, 0);
        this.scannerPage.load();
    }
    showFoodLog() {
        this.showOnly(this.foodLogSection);
        this.setHeader('Food Log', 'Track your daily calories and macronutrient intake in real-time');
        window.scrollTo(0, 0);
        this.foodLogPage.show();
    }
}
// We start the app when the HTML of the page is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
//# sourceMappingURL=app.js.map