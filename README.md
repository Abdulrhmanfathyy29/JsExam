# NutriPlan 🥑

Food, nutrition and meal planning web app.
Final project — HTML, Tailwind CSS, TypeScript.

The user can:

- browse recipes and filter them by name, category or cuisine
- open a recipe to see the ingredients, the steps, the video and the nutrition facts
- search packaged products by name or by barcode and read their Nutri-Score
- log meals and products in a Food Log and follow the calories of the week

---

## 1. Project structure

```
JS Exam/
├── index.html              the only HTML page of the app
├── css/
│   └── style.css           the styles that Tailwind does not give us
├── src/                    the TypeScript we write
│   ├── app.ts              the App class, it starts everything
│   ├── config.ts           the URLs, the key and the default values
│   ├── types.ts            the interfaces of the project
│   ├── globals.d.ts        tells TypeScript that SweetAlert2 exists
│   ├── router.ts           chooses the page from the URL (#meals, #foodlog...)
│   ├── ui.ts               toasts, loading cards and the two badges
│   ├── services/
│   │   ├── api.ts          every call to the API
│   │   ├── storage.ts      read and write in localStorage
│   │   └── nutrition.ts    ingredients, steps and nutrition facts
│   └── pages/
│       ├── meals.ts        the recipes page
│       ├── recipe.ts       the page of one recipe
│       ├── scanner.ts      the product scanner page
│       └── foodlog.ts      the Food Log page
├── js/                     the JavaScript built from src/ (never edited by hand)
├── serve.json              the local server sends no-cache headers
├── tsconfig.json           the TypeScript settings
└── package.json
```

Three folders is enough for this project:

- **`services/`** — the classes that bring the data (the API and localStorage).
  They know nothing about the HTML.
- **`pages/`** — one class for each page of the app. They build their HTML and
  listen to the clicks.
- the four files at the root of `src/` are used by everybody.

`index.html` holds the layout (the sidebar, the header and four empty
`<section>`). Every page class fills its own section with `innerHTML`.

---

## 2. How to run it

```bash
npm install     # installs TypeScript and the small local server
npm run build   # compiles src/*.ts  ->  js/*.js
npm start       # opens http://localhost:8080
```

`npm run dev` does the build and starts the server in one command, and
`npm run watch` rebuilds automatically at every save while we work.

The page must be opened with the server (`http://localhost:8080`) and **not** by
double clicking `index.html`, because the browser blocks ES modules on `file://`.
The Live Server extension of VS Code works too.

---

## 3. The libraries

They all come from a CDN inside `index.html`, so there is nothing to install:

| Library              | What it is used for                  |
| -------------------- | ------------------------------------ |
| Tailwind CSS 4       | all the styling                      |
| Font Awesome 6       | the icons                            |
| Google Fonts (Inter) | the font                             |
| SweetAlert2          | the confirmation and success windows |

---

## 4. The API

Base URL: `https://nutriplan-api.vercel.app/api` (the key is in `src/config.ts`).

| Method | Endpoint                               | Used by                           |
| ------ | -------------------------------------- | --------------------------------- |
| GET    | `/meals/random?count=25`               | first list of recipes             |
| GET    | `/meals/search?q=`                     | search bar                        |
| GET    | `/meals/filter?category=&area=&limit=` | category cards and cuisine pills  |
| GET    | `/meals/:id`                           | recipe page                       |
| GET    | `/meals/categories`                    | the 14 category cards             |
| GET    | `/meals/areas`                         | the cuisine pills                 |
| POST   | `/nutrition/analyze`                   | the nutrition facts of a recipe   |
| GET    | `/products/search?q=&page=&limit=`     | product search                    |
| GET    | `/products/barcode/:code`              | barcode lookup                    |
| GET    | `/products/categories`                 | the category pills of the scanner |
| GET    | `/products/category/:name`             | products of one category          |

Two other free APIs are used only when the main one cannot answer:

- **TheMealDB** — when `/meals/:id` does not find a recipe
- **OpenFoodFacts** — for the ingredients and the allergens of a product,
  because our API does not send them

Nothing is written in the code: the categories, the cuisines, the recipes and the
products are always the ones the API sends.

### Two things the API does not give us

1. **The cooking time.** The meals endpoint has no time field, so the recipe page
   shows `CONFIG.DEFAULT_COOKING_TIME_MIN` (30 min).
2. **The nutrition when `/nutrition/analyze` fails.** This endpoint answers with an
   error about once every four calls, so `ApiService` tries it 3 times. If the three
   tries fail, `NutritionService.estimateNutrition()` shows an estimation based on
   the category of the meal, and this estimation is **not** saved, so the real
   values are used again as soon as the API works.

---

## 5. How the code works

### The router

The app has one HTML page and four sections. `Router` reads the hash of the URL
and calls the function of that page:

| URL           | Page            |
| ------------- | --------------- |
| `#meals`      | recipes         |
| `#meal/52772` | one recipe      |
| `#scanner`    | product scanner |
| `#foodlog`    | Food Log        |

`App.showOnly()` shows one section and hides the three others.

### The services

- **ApiService** — does the `fetch` calls, adds the `x-api-key` header, stops a
  request that takes more than 12 seconds and keeps the answers in a small cache
  object so the same request is not sent twice.
- **StorageService** — saves the Food Log and the goals in `localStorage`.
  One day is one key like `2026-08-16`.
- **NutritionService** — reads the ingredients (the two APIs do not send them the
  same way), cuts the instructions into steps and gets the nutrition facts.

### The pages

Every page class follows the same plan:

1. `load()` or `show()` builds the HTML of the page
2. `addEventListeners()` listens to the clicks
3. the `create...()` methods return the HTML of one card or one line

### What is saved in the browser

| Key                         | Content                                        |
| --------------------------- | ---------------------------------------------- |
| `nutriplan_daily_log`       | every day with its items and its totals        |
| `nutriplan_user_goals`      | the daily targets (2000 kcal, 140g protein...) |
| `nutriplan_nutrition_cache` | the nutrition facts already calculated         |
