/**
 * Modal Utility for Confirmations
 */

class Modal {
  constructor() {
    this.container = document.getElementById('modal-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'modal-container';
      document.body.appendChild(this.container);
    }
  }

  confirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm opacity-0 transition-opacity duration-300';
      
      let confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white';
      if (type === 'warning') confirmButtonClass = 'bg-amber-600 hover:bg-amber-700 text-white';
      if (type === 'primary') confirmButtonClass = 'bg-sky-600 hover:bg-sky-700 text-white';

      modal.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 transform scale-95 transition-transform duration-300 border border-slate-200 dark:border-slate-800">
          <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">${title}</h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">${message}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button id="modal-cancel" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              ${cancelText}
            </button>
            <button id="modal-confirm" class="rounded-xl px-4 py-2 text-sm font-semibold transition ${confirmButtonClass}">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      this.container.appendChild(modal);

      // Animate in
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
      });

      const cleanup = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
        }, 300);
      };

      modal.querySelector('#modal-confirm').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      modal.querySelector('#modal-cancel').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
    });
  }
}

window.modal = new Modal();
