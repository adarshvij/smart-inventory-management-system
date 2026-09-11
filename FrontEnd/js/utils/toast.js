/**
 * Toast Notification Utility
 */

class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `transform transition-all duration-300 translate-y-full opacity-0 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border min-w-[300px] max-w-sm`;
    
    let bgColor = 'bg-white dark:bg-slate-800';
    let borderColor = 'border-slate-200 dark:border-slate-700';
    let icon = '';
    let textColor = 'text-slate-800 dark:text-slate-100';

    if (type === 'success') {
      borderColor = 'border-emerald-500';
      icon = `<div class="rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div>`;
    } else if (type === 'error') {
      borderColor = 'border-red-500';
      icon = `<div class="rounded-full bg-red-100 p-1 text-red-600 dark:bg-red-900/30 dark:text-red-400"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div>`;
    } else if (type === 'warning') {
      borderColor = 'border-amber-500';
      icon = `<div class="rounded-full bg-amber-100 p-1 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>`;
    } else {
      borderColor = 'border-sky-500';
      icon = `<div class="rounded-full bg-sky-100 p-1 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>`;
    }

    toast.classList.add(bgColor, borderColor);

    toast.innerHTML = `
      ${icon}
      <div class="flex-1 text-sm font-medium ${textColor}">${message}</div>
      <button type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => this.remove(toast));

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-full', 'opacity-0');
    });

    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }
  }

  remove(toast) {
    toast.classList.add('translate-y-full', 'opacity-0');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }
}

window.toast = new Toast();
