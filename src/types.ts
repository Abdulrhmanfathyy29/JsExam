// The types used in the project.
// The API can send a meal in two shapes (our NutriPlan API and TheMealDB),
// so a lot of fields are optional.

export interface Meal {
  id?: string;
  idMeal?: string;
  name?: string;
  strMeal?: string;
  category?: string;
  strCategory?: string;
  area?: string;
  strArea?: string;
  thumbnail?: string;
  strMealThumb?: string;
  instructions?: string[] | string;
  strInstructions?: string;
  ingredients?: any[];
  youtube?: string;
  strYoutube?: string;
  source?: string;
  strSource?: string;
  // TheMealDB sends strIngredient1 ... strIngredient20
  [key: string]: any;
}

export interface Ingredient {
  ingredient: string;
  measure: string;
  image: string;
}

// Used for the meal categories, the cuisines and the product categories
export interface Category {
  id?: string;
  name?: string;
}

export interface Nutrients {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  cholesterol?: number;
  sodium?: number;
  salt?: number;
}

export interface MealNutrition {
  recipeName: string;
  servings: number;
  perServing: Nutrients;
  dailyValues: Nutrients;
}

export interface Product {
  barcode?: string;
  name?: string;
  brand?: string;
  image?: string;
  quantity?: string;
  nutritionGrade?: string;
  novaGroup?: number;
  nutrients?: Nutrients;
  ingredients_text?: string;
  allergens?: string | string[];
  [key: string]: any;
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LogEntry {
  id: string;
  type: string;
  name: string;
  brand: string;
  thumbnail: string;
  barcode: string;
  servings: number;
  portionText: string;
  nutrition: Nutrients;
  loggedAt: string;
}

export interface DayLog {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: LogEntry[];
}

export interface WeekDay {
  dayName: string;
  dayNum: number;
  isToday: boolean;
  calories: number;
  itemCount: number;
}
