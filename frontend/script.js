// Modal and form management
const modal = document.getElementById('authModal');
const closeBtn = document.querySelector('.close');

// Navigation handlers
document.getElementById('signUpLink').addEventListener('click', (e) => {
    e.preventDefault();
    showModal('register');
});

document.getElementById('getStartedLink').addEventListener('click', (e) => {
    e.preventDefault();
    showModal('register');
});

document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('register');
});

document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    switchForm('login');
});

// Close modal
closeBtn.addEventListener('click', () => {
    closeModal();
});

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

function showModal(formType) {
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    switchForm(formType);
}

function closeModal() {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function switchForm(formType) {
    const registerContainer = document.getElementById('registerFormContainer');
    const loginContainer = document.getElementById('loginFormContainer');

    if (formType === 'register') {
        registerContainer.classList.add('active');
        loginContainer.classList.remove('active');
    } else {
        loginContainer.classList.add('active');
        registerContainer.classList.remove('active');
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password }) // Backend expects username, but we'll use email
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('loginMessage').textContent = 'Login successful!';
            document.getElementById('loginMessage').style.color = 'green';
            localStorage.setItem('token', result.token);
            // Close modal and show success
            setTimeout(() => {
                closeModal();
                alert('Welcome to GUARDIUM!');
                // Show tools
                document.getElementById('breachSection').style.display = 'block';
                document.getElementById('aiSection').style.display = 'block';
                document.getElementById('userBreachesSection').style.display = 'block';
                document.getElementById('breachSection').scrollIntoView({ behavior: 'smooth' });
            }, 1000);
        } else {
            document.getElementById('loginMessage').textContent = result.message;
            document.getElementById('loginMessage').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('loginMessage').textContent = 'Error: ' + error.message;
        document.getElementById('loginMessage').style.color = 'red';
    }
});

// Register form handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('registerMessage').textContent = 'Passwords do not match';
        document.getElementById('registerMessage').style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password }) // Backend expects username, using email
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('registerMessage').textContent = 'Registration successful! Please sign in.';
            document.getElementById('registerMessage').style.color = 'green';
            // Switch to login
            setTimeout(() => {
                switchForm('login');
            }, 2000);
        } else {
            document.getElementById('registerMessage').textContent = result.message;
            document.getElementById('registerMessage').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('registerMessage').textContent = 'Error: ' + error.message;
        document.getElementById('registerMessage').style.color = 'red';
    }
});

// Breach check handler
document.getElementById('checkBreachBtn').addEventListener('click', async () => {
    const email = document.getElementById('breachEmail').value;
    if (!email) {
        document.getElementById('breachMessage').textContent = 'Please enter an email.';
        return;
    }
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(`/breach/check-email/${email}`, { headers });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('breachMessage').textContent = 'Breaches found!';
            document.getElementById('breachResults').innerHTML = `<ul>${result.breaches[0].map(site => `<li>${site}</li>`).join('')}</ul>`;
        } else {
            document.getElementById('breachMessage').textContent = 'No breaches found.';
            document.getElementById('breachResults').innerHTML = '';
        }
    } catch (error) {
        document.getElementById('breachMessage').textContent = 'Error: ' + error.message;
    }
});

// AI suggestion handler
document.getElementById('getSuggestionBtn').addEventListener('click', async () => {
    const prompt = document.getElementById('aiPrompt').value;
    if (!prompt) {
        document.getElementById('aiMessage').textContent = 'Please enter a prompt.';
        return;
    }
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch('/ai/suggest', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('aiMessage').textContent = 'Suggestion:';
            document.getElementById('aiResults').textContent = result.suggestion;
        } else {
            document.getElementById('aiMessage').textContent = result.error;
        }
    } catch (error) {
        document.getElementById('aiMessage').textContent = 'Error: ' + error.message;
    }
});

// Load user breaches handler
document.getElementById('loadBreachesBtn').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('breachesMessage').textContent = 'Please sign in to view your breaches.';
        return;
    }
    try {
        const response = await fetch('/auth/breaches', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('breachesMessage').textContent = 'Your breaches:';
            const breachesHtml = result.breaches.map(breach => 
                `<div><strong>${breach.email}</strong> - ${breach.sites.join(', ')} (checked on ${new Date(breach.checkedAt).toLocaleDateString()})</div>`
            ).join('');
            document.getElementById('breachesList').innerHTML = breachesHtml;
        } else {
            document.getElementById('breachesMessage').textContent = result.message;
        }
    } catch (error) {
        document.getElementById('breachesMessage').textContent = 'Error: ' + error.message;
    }
});