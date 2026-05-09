let deferredInstallPrompt = null;

function createInstallButton() {
  if (document.getElementById('installAppBtn')) return;

  const button = document.createElement('button');
  button.id = 'installAppBtn';
  button.type = 'button';
  button.className = 'fixed bottom-5 right-5 z-50 hidden rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-300 transition hover:bg-sky-500';
  button.textContent = 'Install App';

  button.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      button.classList.add('hidden');
    }

    deferredInstallPrompt = null;
  });

  document.body.appendChild(button);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Fail silently in local static contexts without HTTPS.
    });
  });
}

function wireInstallPrompt() {
  createInstallButton();

  const installButton = document.getElementById('installAppBtn');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;

    if (installButton) {
      installButton.classList.remove('hidden');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installButton) {
      installButton.classList.add('hidden');
    }
  });
}

registerServiceWorker();
wireInstallPrompt();
