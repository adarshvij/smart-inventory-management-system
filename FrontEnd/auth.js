const REMEMBERED_EMAIL_KEY = 'sims_remembered_email';
const API_BASE = 'http://localhost:5000/api';

function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;

  const typeStyles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700'
  };

  alertBox.className = `mb-4 rounded-xl border px-4 py-3 text-sm ${typeStyles[type] || typeStyles.info}`;
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function wirePasswordToggle(buttonId, inputId) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);

  if (!button || !input) return;

  button.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    button.textContent = isHidden ? 'Hide' : 'Show';
  });
}

function handleSignupPage() {
  const form = document.getElementById('signupForm');
  if (!form) return;

  wirePasswordToggle('toggleSignupPassword', 'signupPassword');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const businessName = document.getElementById('businessName')?.value.trim() || '';
    const emailRaw = document.getElementById('signupEmail')?.value || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const email = normalizeEmail(emailRaw);

    if (fullName.length < 3) {
      showAlert('Please enter your full name (minimum 3 characters).');
      return;
    }

    if (businessName.length < 2) {
      showAlert('Please enter a valid business name.');
      return;
    }

    if (!email || !email.includes('@')) {
      showAlert('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Password and confirm password must match.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, businessName, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.message || 'Signup failed. Please try again.');
        return;
      }

      showAlert('Account created successfully. Redirecting to login page...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    } catch (err) {
      showAlert('Unable to connect to server. Please make sure the backend is running.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    }
  });
}

function handleLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  wirePasswordToggle('toggleLoginPassword', 'loginPassword');

  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
  const emailInput = document.getElementById('loginEmail');
  const rememberMe = document.getElementById('rememberMe');

  if (rememberedEmail && emailInput && rememberMe) {
    emailInput.value = rememberedEmail;
    rememberMe.checked = true;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailRaw = document.getElementById('loginEmail')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const email = normalizeEmail(emailRaw);

    if (!email || !password) {
      showAlert('Please fill in both email and password.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      // Store session
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (rememberMe?.checked) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      showAlert('Login successful. Redirecting to dashboard...', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } catch (err) {
      showAlert('Unable to connect to server. Please make sure the backend is running.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  });
}

handleSignupPage();
handleLoginPage();
