const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/**
 * FoodLogPage
 * The Food Log page: the progress of the day, the list of the items the user
 * logged and a small summary of the week.
 * Everything is read from localStorage, there is no API here.
 */
export class FoodLogPage {
    constructor(storage, ui, goToMeals, goToScanner) {
        this.section = document.getElementById('foodlog-section');
        this.storage = storage;
        this.ui = ui;
        this.goToMeals = goToMeals;
        this.goToScanner = goToScanner;
        this.show();
    }
    /** Build the whole page. */
    show() {
        const todayLog = this.storage.getTodayLog();
        const goals = this.storage.getUserGoals();
        const week = this.getWeek(todayLog);
        const today = new Date();
        const todayText = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        // The numbers of the three cards at the bottom
        let weekCalories = 0;
        let weekItems = 0;
        let daysOnGoal = 0;
        for (let i = 0; i < week.length; i++) {
            weekCalories += week[i].calories;
            weekItems += week[i].itemCount;
            if (week[i].calories > 0 && week[i].calories <= goals.calories) {
                daysOnGoal++;
            }
        }
        const averageCalories = Math.round(weekCalories / 7);
        // The "Clear All" button, only if there is something to clear
        let clearButton = '';
        if (todayLog.meals.length > 0) {
            clearButton = `
        <button id="clear-all-food-log-btn" class="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-trash-can text-xs"></i>
          <span>Clear All</span>
        </button>
      `;
        }
        // The list of the items, or the empty message
        let itemsHtml = this.getEmptyHtml();
        if (todayLog.meals.length > 0) {
            itemsHtml = '<div class="space-y-3" id="logged-items-container">';
            for (let i = 0; i < todayLog.meals.length; i++) {
                itemsHtml += this.createLoggedItem(todayLog.meals[i]);
            }
            itemsHtml += '</div>';
        }
        // The seven boxes of the week
        let weekHtml = '';
        for (let i = 0; i < week.length; i++) {
            weekHtml += this.createDayBox(week[i]);
        }
        this.section.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">

        <!-- 1. The blue banner -->
        <div class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-sm">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <i class="fa-solid fa-clipboard-list text-2xl"></i>
              <h2 class="text-xl sm:text-2xl font-bold tracking-tight">Food Log</h2>
            </div>
            <p class="text-white/80 text-xs sm:text-sm font-normal">Track and monitor your daily nutrition intake</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs text-white/80 font-normal">Today</p>
            <p class="text-base sm:text-lg font-bold">${todayText}</p>
          </div>
        </div>

        <!-- 2. The progress of the day -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
          <div class="flex items-center gap-2 mb-6">
            <i class="fa-solid fa-fire text-orange-500 text-base"></i>
            <h3 class="text-sm font-bold text-gray-900">Today's Nutrition</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${this.createProgressCard('Calories', todayLog.totalCalories, goals.calories, 'kcal', 'emerald')}
            ${this.createProgressCard('Protein', todayLog.totalProtein, goals.protein, 'g', 'blue')}
            ${this.createProgressCard('Carbs', todayLog.totalCarbs, goals.carbs, 'g', 'amber')}
            ${this.createProgressCard('Fat', todayLog.totalFat, goals.fat, 'g', 'purple')}
          </div>

          <div class="border-t border-gray-100 my-6"></div>

          <!-- The items logged today -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-bold text-gray-700">Logged Items (${todayLog.meals.length})</h4>
              ${clearButton}
            </div>

            ${itemsHtml}
          </div>
        </div>

        <!-- 3. The week -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
          <div class="flex items-center gap-2 mb-6">
            <i class="fa-solid fa-calendar-days text-indigo-600 text-base"></i>
            <h3 class="text-sm font-bold text-gray-900">Weekly Overview</h3>
          </div>

          <div class="grid grid-cols-7 gap-2.5 text-center">
            ${weekHtml}
          </div>
        </div>

        <!-- 4. The 3 stat cards, under the weekly overview -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${this.createStatCard('fa-chart-line', 'emerald', 'Weekly Average', averageCalories + ' kcal')}
          ${this.createStatCard('fa-utensils', 'blue', 'Total Items This Week', weekItems + ' items')}
          ${this.createStatCard('fa-bullseye', 'purple', 'Days On Goal', daysOnGoal + ' / 7')}
        </div>

      </div>
    `;
        this.addEventListeners();
    }
    /**
     * Build the seven days of this week, from Monday to Sunday, with the
     * calories and the number of items of each day.
     */
    getWeek(todayLog) {
        const allLogs = this.storage.getAllDailyLogs();
        const today = new Date();
        // getDay() gives 0 for Sunday, but we want Monday first
        const todayIndex = (today.getDay() + 6) % 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - todayIndex);
        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const isToday = i === todayIndex;
            // For today we take the log we already read, it is the most recent one
            const log = isToday ? todayLog : allLogs[this.storage.getDateString(date)];
            week.push({
                dayName: DAY_NAMES[i],
                dayNum: date.getDate(),
                isToday: isToday,
                calories: log ? log.totalCalories : 0,
                itemCount: log ? log.meals.length : 0
            });
        }
        return week;
    }
    /** One of the four cards (Calories, Protein, Carbs, Fat). */
    createProgressCard(label, value, goal, unit, color) {
        const percent = Math.min(Math.round((value / goal) * 100), 100);
        // When the user is over his goal, the card turns red
        if (value >= goal) {
            color = 'red';
        }
        return `
      <div class="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
        <div class="flex justify-between items-center text-xs mb-1.5">
          <span class="font-medium text-gray-700">${label}</span>
          <span class="font-bold text-${color}-500">${percent}%</span>
        </div>
        <div class="w-full bg-gray-200/70 rounded-full h-2 mb-2 overflow-hidden">
          <div class="bg-${color}-500 h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="font-bold text-${color}-600">${value} ${unit}</span>
          <span class="text-gray-400">/ ${goal} ${unit}</span>
        </div>
      </div>
    `;
    }
    /** One line of the list of logged items. */
    createLoggedItem(item) {
        const isRecipe = item.type === 'meal';
        const picture = item.thumbnail
            ? `<img src="${item.thumbnail}" alt="${item.name}" class="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-gray-200 shrink-0" />`
            : `<div class="w-11 h-11 rounded-xl bg-blue-100/70 text-blue-500 flex items-center justify-center text-base shrink-0">
           <i class="fa-solid fa-box"></i>
         </div>`;
        // Under the name: "1 serving • Recipe" or "Nutella • Product"
        const subtitle = isRecipe ? item.portionText : item.brand || 'Product';
        const kind = isRecipe
            ? '<span class="text-emerald-600 font-medium">Recipe</span>'
            : '<span class="text-blue-600 font-medium">Product</span>';
        // The hour when the item was logged, like "12:05 PM"
        const time = new Date(item.loggedAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        return `
      <div class="flex items-center justify-between p-3.5 bg-gray-50/60 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors">
        <div class="flex items-center gap-3.5">
          ${picture}
          <div>
            <h5 class="text-xs font-bold text-gray-900 leading-tight mb-0.5">${item.name}</h5>
            <p class="text-[11px] text-gray-400 font-normal">
              ${subtitle} • ${kind}
            </p>
            <p class="text-[10px] text-gray-400">${time}</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <span class="text-sm font-black text-emerald-600 block leading-tight">${item.nutrition.calories}</span>
            <span class="text-[10px] text-gray-400">kcal</span>
          </div>

          <div class="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
            <span class="px-2 py-0.5 rounded-md bg-blue-50/50 border border-blue-100/50 text-gray-500">${item.nutrition.protein}g P</span>
            <span class="px-2 py-0.5 rounded-md bg-amber-50/50 border border-amber-100/50 text-gray-500">${item.nutrition.carbs}g C</span>
            <span class="px-2 py-0.5 rounded-md bg-gray-100/60 border border-gray-200/60 text-gray-500">${item.nutrition.fat}g F</span>
          </div>

          <button class="delete-logged-item-btn text-gray-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer ml-1" data-id="${item.id}" title="Delete item">
            <i class="fa-regular fa-trash-can text-sm"></i>
          </button>
        </div>
      </div>
    `;
    }
    /** One box of the weekly overview. */
    createDayBox(day) {
        const boxStyle = day.isToday ? 'bg-indigo-50/80 border border-indigo-100' : 'bg-gray-50/50 border border-transparent';
        const caloriesColor = day.calories > 0 ? 'text-emerald-600' : 'text-gray-400';
        const items = day.itemCount > 0 ? `<span class="text-[9px] text-gray-400 mt-1">${day.itemCount} items</span>` : '';
        return `
      <div class="p-3 rounded-xl flex flex-col items-center justify-between min-h-[90px] ${boxStyle}">
        <span class="text-[11px] text-gray-500 font-medium">${day.dayName}</span>
        <span class="text-xs font-bold text-gray-800 my-1">${day.dayNum}</span>
        <div>
          <span class="text-xs font-bold ${caloriesColor} block">${day.calories}</span>
          <span class="text-[9px] text-gray-400 block">kcal</span>
        </div>
        ${items}
      </div>
    `;
    }
    /** One of the three cards under the week. */
    createStatCard(icon, color, label, value) {
        return `
      <div class="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center text-base shrink-0">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div>
          <p class="text-[11px] text-gray-400 font-medium">${label}</p>
          <p class="text-sm font-bold text-gray-900">${value}</p>
        </div>
      </div>
    `;
    }
    /** Shown when nothing is logged today. */
    getEmptyHtml() {
        return `
      <div class="py-12 text-center flex flex-col items-center justify-center">
        <div class="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-xl mb-3">
          <i class="fa-solid fa-utensils"></i>
        </div>
        <p class="text-sm font-bold text-gray-700 mb-1">No food logged today</p>
        <p class="text-xs text-gray-400 mb-5">Start tracking your nutrition by logging meals or scanning products</p>
        <div class="flex items-center gap-3">
          <button id="empty-browse-recipes-btn" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs">
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Browse Recipes</span>
          </button>
          <button id="empty-scan-product-btn" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs">
            <i class="fa-solid fa-barcode text-xs"></i>
            <span>Scan Product</span>
          </button>
        </div>
      </div>
    `;
    }
    addEventListeners() {
        // The two buttons of the empty page
        const browseBtn = document.getElementById('empty-browse-recipes-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => this.goToMeals());
        }
        const scanBtn = document.getElementById('empty-scan-product-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.goToScanner());
        }
        // The small bin on every line
        this.section.querySelectorAll('.delete-logged-item-btn').forEach((element) => {
            const button = element;
            button.addEventListener('click', () => {
                this.storage.removeLoggedItem(button.dataset.id);
                this.ui.showToast('Item removed from daily log');
                this.show();
            });
        });
        // The "Clear All" button
        const clearBtn = document.getElementById('clear-all-food-log-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearEverything());
        }
    }
    /** Ask the user before deleting the whole day. */
    async clearEverything() {
        const answer = await Swal.fire({
            title: "Clear Today's Log?",
            text: 'This will remove all logged food items for today.',
            icon: 'warning',
            iconColor: '#f97316',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-3xl p-6 sm:p-7 shadow-2xl',
                title: 'text-xl font-bold text-gray-900',
                htmlContainer: 'text-xs text-gray-500',
                confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5 shadow-xs',
                cancelButton: 'rounded-xl text-xs font-bold px-4 py-2.5 shadow-xs'
            }
        });
        if (!answer.isConfirmed) {
            return;
        }
        this.storage.clearTodayLog();
        this.show();
        await Swal.fire({
            title: 'Cleared!',
            text: 'Your food log has been cleared.',
            icon: 'success',
            iconColor: '#10b981',
            showConfirmButton: false,
            timer: 1500,
            customClass: {
                popup: 'rounded-3xl p-6 sm:p-7 shadow-2xl',
                title: 'text-xl font-bold text-gray-900',
                htmlContainer: 'text-xs text-gray-500'
            }
        });
        this.ui.showToast("Today's log cleared");
    }
}
//# sourceMappingURL=foodlog.js.map