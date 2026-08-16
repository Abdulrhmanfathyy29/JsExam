/**
 * Router
 * Reads the end of the URL (#meals, #scanner, #meal/52772...) and calls the
 * function of that page. It also puts the green style on the active link.
 */
export class Router {
  routes: any;

  constructor(routes: any) {
    this.routes = routes;

    // The browser fires "hashchange" every time the part after the # changes
    window.addEventListener('hashchange', () => this.openPageFromUrl());

    // Open the first page
    this.openPageFromUrl();
  }

  /** Change the page from the code (used by the buttons of the app). */
  goTo(page: string) {
    window.location.hash = '#' + page;
  }

  /** Read the URL and open the right page. */
  openPageFromUrl() {
    const hash = window.location.hash.replace('#', '').trim();
    let page = hash || 'meals';
    let mealId = '';

    // "meal/52772" is a page with a parameter: the id of the recipe
    if (page.startsWith('meal/')) {
      mealId = page.split('/')[1];
      page = 'meal';
    }

    this.updateSidebarLinks(page);

    // If the page does not exist we show the recipes
    const openPage = this.routes[page] || this.routes.meals;
    openPage(mealId);
  }

  /** Put the green style on the link of the page we are on. */
  updateSidebarLinks(page: string) {
    const links = document.querySelectorAll('#sidebar nav a[data-route]');

    links.forEach((element) => {
      const link = element as HTMLAnchorElement;
      // On the recipe details page, "Meals & Recipes" stays active
      const isActive = link.dataset.route === page || (page === 'meal' && link.dataset.route === 'meals');
      const icon = link.querySelector('i');

      if (isActive) {
        link.className =
          'flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold text-sm transition-colors';
        if (icon) {
          icon.className = icon.className.replace('text-gray-400', 'text-emerald-600');
        }
      } else {
        link.className =
          'flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium text-sm transition-colors';
        if (icon) {
          icon.className = icon.className.replace('text-emerald-600', 'text-gray-400');
        }
      }
    });
  }
}
