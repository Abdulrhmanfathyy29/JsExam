import { CONFIG } from '../config.js';
import { DayLog, Goals, LogEntry } from '../types.js';

const DAILY_LOG_KEY = 'nutriplan_daily_log';
const USER_GOALS_KEY = 'nutriplan_user_goals';
const NUTRITION_CACHE_KEY = 'nutriplan_nutrition_cache';

/**
 * StorageService
 * Saves and reads everything in localStorage:
 * the Food Log, the user goals and the nutrition we already calculated.
 */
export class StorageService {
  constructor() {
    // The first time the app is opened we put the default values
    if (!this.read(USER_GOALS_KEY)) {
      this.save(USER_GOALS_KEY, CONFIG.DEFAULT_DAILY_GOALS);
    }
    if (!this.read(DAILY_LOG_KEY)) {
      this.save(DAILY_LOG_KEY, {});
    }
  }

  /** Read something from localStorage. */
  read(key: string, ifEmpty: any = null) {
    try {
      const text = localStorage.getItem(key);
      if (!text) {
        return ifEmpty;
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('Could not read ' + key + ':', error);
      return ifEmpty;
    }
  }

  /** Save something in localStorage. */
  save(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Could not save ' + key + ':', error);
    }
  }

  /** Turn a date into "2026-08-16", we use it as the key of one day. */
  getDateString(date: Date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // ---------- the goals ----------

  getUserGoals(): Goals {
    return this.read(USER_GOALS_KEY, CONFIG.DEFAULT_DAILY_GOALS);
  }

  // ---------- the Food Log ----------

  getAllDailyLogs() {
    return this.read(DAILY_LOG_KEY, {});
  }

  /** An empty day, so the page always has something to show. */
  createEmptyLog(date: string): DayLog {
    return {
      date: date,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: []
    };
  }

  getTodayLog(): DayLog {
    const today = this.getDateString();
    const allLogs = this.getAllDailyLogs();
    return allLogs[today] || this.createEmptyLog(today);
  }

  /** Add a recipe or a product to the log of today. */
  logItem(item: any) {
    const today = this.getDateString();
    const allLogs = this.getAllDailyLogs();
    const log: DayLog = allLogs[today] || this.createEmptyLog(today);
    const nutrition = item.nutrition || {};

    const entry: LogEntry = {
      // The id is the time plus a few random letters, so it is unique
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      type: item.type,
      name: item.name,
      brand: item.brand || '',
      thumbnail: item.thumbnail || '',
      barcode: item.barcode || '',
      servings: item.servings || 1,
      portionText: item.portionText || '100g',
      nutrition: {
        calories: Math.round(nutrition.calories || 0),
        protein: this.round1(nutrition.protein),
        carbs: this.round1(nutrition.carbs),
        fat: this.round1(nutrition.fat)
      },
      loggedAt: new Date().toISOString()
    };

    log.meals.unshift(entry); // the newest one goes on top
    this.updateTotals(log);

    allLogs[today] = log;
    this.save(DAILY_LOG_KEY, allLogs);
  }

  /** Remove one item of the log with its id. */
  removeLoggedItem(itemId: string) {
    const today = this.getDateString();
    const allLogs = this.getAllDailyLogs();
    const log: DayLog = allLogs[today];
    if (!log) {
      return;
    }

    log.meals = log.meals.filter((meal) => meal.id !== itemId);
    this.updateTotals(log);

    allLogs[today] = log;
    this.save(DAILY_LOG_KEY, allLogs);
  }

  /** Remove everything logged today. */
  clearTodayLog() {
    const today = this.getDateString();
    const allLogs = this.getAllDailyLogs();
    allLogs[today] = this.createEmptyLog(today);
    this.save(DAILY_LOG_KEY, allLogs);
  }

  /** Add all the items of one day to get the totals. */
  updateTotals(log: DayLog) {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (let i = 0; i < log.meals.length; i++) {
      const nutrition = log.meals[i].nutrition;
      calories += nutrition.calories || 0;
      protein += nutrition.protein || 0;
      carbs += nutrition.carbs || 0;
      fat += nutrition.fat || 0;
    }

    log.totalCalories = Math.round(calories);
    log.totalProtein = this.round1(protein);
    log.totalCarbs = this.round1(carbs);
    log.totalFat = this.round1(fat);
  }

  /** Keep only one number after the point (32.456 becomes 32.5). */
  round1(value: number) {
    return Math.round((value || 0) * 10) / 10;
  }

  // ---------- the nutrition we already calculated ----------

  getCachedNutrition(key: string) {
    const cache = this.read(NUTRITION_CACHE_KEY, {});
    return cache[key];
  }

  saveCachedNutrition(key: string, data: any) {
    const cache = this.read(NUTRITION_CACHE_KEY, {});
    cache[key] = data;
    this.save(NUTRITION_CACHE_KEY, cache);
  }
}
