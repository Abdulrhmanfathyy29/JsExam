/**
 * UI
 * The small pieces of interface we use on more than one page:
 * the toast message, the grey loading cards and the two product badges.
 */
export class UI {
  /**
   * Green message at the bottom right that disappears alone.
   */
  showToast(message: string) {
    // If a message is already on the screen we remove it first
    const oldToast = document.getElementById('custom-app-toast');
    if (oldToast) {
      oldToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'custom-app-toast';
    toast.className =
      'fixed bottom-6 right-6 z-50 bg-emerald-900/95 text-white font-semibold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 backdrop-blur-xs border border-emerald-700 animate-fade-in';
    toast.innerHTML = '<span>' + message + '</span>';

    document.body.appendChild(toast);

    // After 3.2 seconds we make it disappear slowly
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * Grey cards shown while the recipes are loading.
   */
  getRecipeSkeletons(count: number) {
    let html = '';

    for (let i = 0; i < count; i++) {
      html += `
      <div class="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-xs animate-pulse flex flex-col">
        <div class="h-44 bg-gray-200"></div>
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
          </div>
          <div class="pt-2 border-t border-gray-100 flex justify-between items-center">
            <div class="h-3 bg-gray-200 rounded w-16"></div>
            <div class="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    `;
    }

    return html;
  }

  /**
   * Grey cards shown while the products are loading.
   */
  getProductSkeletons(count: number) {
    let html = '';

    for (let i = 0; i < count; i++) {
      html += `
      <div class="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-xs animate-pulse flex flex-col">
        <div class="h-44 bg-gray-200"></div>
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div class="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-4/5 mb-3"></div>
          </div>
          <div class="grid grid-cols-4 gap-1 mt-2">
            <div class="h-10 bg-gray-100 rounded"></div>
            <div class="h-10 bg-gray-100 rounded"></div>
            <div class="h-10 bg-gray-100 rounded"></div>
            <div class="h-10 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    `;
    }

    return html;
  }

  /**
   * The coloured "NUTRI-SCORE A" label put on the picture of a product.
   */
  getNutriScoreBadge(grade: string) {
    const colors: any = {
      a: 'bg-emerald-600',
      b: 'bg-lime-500',
      c: 'bg-yellow-500',
      d: 'bg-orange-500',
      e: 'bg-rose-600'
    };

    const letter = grade ? grade.toLowerCase() : 'unknown';
    const color = colors[letter] || 'bg-slate-400';
    const label = letter === 'unknown' ? 'NUTRI-SCORE UNKNOWN' : 'NUTRI-SCORE ' + letter.toUpperCase();

    return `<span class="px-2 py-0.5 ${color} text-white text-[9px] font-black rounded-sm shadow-xs uppercase tracking-wider">${label}</span>`;
  }

  /**
   * The small coloured circle with the NOVA group (from 1 to 4).
   */
  getNovaBadge(group: number) {
    const colors: any = {
      1: 'bg-emerald-600',
      2: 'bg-yellow-500',
      3: 'bg-orange-500',
      4: 'bg-rose-600'
    };

    const color = colors[group] || 'bg-gray-400';

    return `<span class="${color} text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs" title="NOVA Group ${group}">${group}</span>`;
  }
}
