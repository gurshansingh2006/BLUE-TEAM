const TOKEN_KEY = 'token';
const USER_EMAIL_KEY = 'userEmail';
const ANONYMOUS_BREACHES_KEY = 'anonymousBreaches';
const DEFAULT_SECURITY_STEPS = [
    'Use unique passwords for each account.',
    'Enable two-factor authentication wherever it is available.',
    'Review sensitive accounts for suspicious sign-ins or password reset emails.'
];

const modal = document.getElementById('authModal');
const closeBtn = document.querySelector('.close');
const signUpLink = document.getElementById('signUpLink');
const getStartedLink = document.getElementById('getStartedLink');
const logoutBtn = document.getElementById('logoutBtn');
const authStatus = document.getElementById('authStatus');
const authOnlySections = Array.from(document.querySelectorAll('.auth-only-section'));

document.querySelector('.hero-scan-btn').addEventListener('click', async () => {
    const email = normalizeEmail(document.getElementById('heroEmail').value);

    if (!email) {
        alert('Please enter your email address first.');
        return;
    }

    document.getElementById('breachEmail').value = email;
    await performBreachCheck(email);
});

signUpLink.addEventListener('click', (event) => {
    event.preventDefault();

    if (isAuthenticated()) {
        document.getElementById('breachSection').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    showModal('register');
});

getStartedLink.addEventListener('click', (event) => {
    event.preventDefault();

    if (isAuthenticated()) {
        document.getElementById('breachSection').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    showModal('register');
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    setAuthenticatedUI(false);
    closeModal();
});

document.getElementById('switchToRegister').addEventListener('click', (event) => {
    event.preventDefault();
    switchForm('register');
});

document.getElementById('switchToLogin').addEventListener('click', (event) => {
    event.preventDefault();
    switchForm('login');
});

closeBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = normalizeEmail(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPassword').value;
    const button = event.submitter;

    setLoading(button, true);

    try {
        const result = await fetchJson('/auth/login', {
            method: 'POST',
            headers: buildHeaders(true, false),
            body: JSON.stringify({ username: email, password })
        });

        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_EMAIL_KEY, result.user?.email || email);
        setMessage('loginMessage', 'Login successful. Your dashboard is ready.', 'success');
        setAuthenticatedUI(true, result.user?.email || email);

        window.setTimeout(() => {
            closeModal();
            document.getElementById('breachSection').scrollIntoView({ behavior: 'smooth' });
        }, 500);
    } catch (error) {
        setMessage('loginMessage', error.message, 'error');
    } finally {
        setLoading(button, false);
    }
});

document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = normalizeEmail(document.getElementById('regEmail').value);
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const button = event.submitter;

    if (password !== confirmPassword) {
        setMessage('registerMessage', 'Passwords do not match.', 'error');
        return;
    }

    setLoading(button, true);

    try {
        const result = await fetchJson('/auth/register', {
            method: 'POST',
            headers: buildHeaders(true, false),
            body: JSON.stringify({ username: email, password })
        });

        setMessage('registerMessage', result.message, 'success');
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').focus();

        window.setTimeout(() => {
            switchForm('login');
        }, 700);
    } catch (error) {
        setMessage('registerMessage', error.message, 'error');
    } finally {
        setLoading(button, false);
    }
});

document.getElementById('checkBreachBtn').addEventListener('click', async () => {
    const email = normalizeEmail(document.getElementById('breachEmail').value);
    const button = document.getElementById('checkBreachBtn');

    if (!email) {
        setMessage('breachMessage', 'Please enter an email address.', 'error');
        return;
    }

    setLoading(button, true);

    try {
        const result = await fetchBreachData(email);
        document.getElementById('heroEmail').value = email;
        renderBreachResults(result);
        updateDashboard(result);
    } catch (error) {
        setMessage('breachMessage', error.message, 'error');
        document.getElementById('breachResults').innerHTML = '';
    } finally {
        setLoading(button, false);
    }
});

document.getElementById('getSuggestionBtn').addEventListener('click', async () => {
    const prompt = document.getElementById('aiPrompt').value.trim();
    const button = document.getElementById('getSuggestionBtn');

    if (!prompt) {
        setMessage('aiMessage', 'Please enter a prompt.', 'error');
        return;
    }

    setLoading(button, true);

    try {
        const result = await fetchJson('/ai/suggest', {
            method: 'POST',
            headers: buildHeaders(true),
            body: JSON.stringify({ prompt })
        });

        setMessage('aiMessage', 'Suggestion ready.', 'success');
        document.getElementById('aiResults').textContent = result.suggestion;
    } catch (error) {
        setMessage('aiMessage', error.message, 'error');
        document.getElementById('aiResults').textContent = '';
    } finally {
        setLoading(button, false);
    }
});

document.getElementById('loadBreachesBtn').addEventListener('click', async () => {
    const button = document.getElementById('loadBreachesBtn');

    if (!isAuthenticated()) {
        setMessage('breachesMessage', 'Please sign in to view your saved breach history.', 'error');
        return;
    }

    setLoading(button, true);

    try {
        const result = await fetchJson('/auth/breaches', {
            headers: buildHeaders(false)
        });

        if (!result.breaches?.length) {
            setMessage('breachesMessage', 'No saved breach checks yet.', 'success');
            document.getElementById('breachesList').innerHTML = '<p class="empty-state">Run a breach check while signed in to save it here.</p>';
            return;
        }

        setMessage('breachesMessage', 'Saved breach history loaded.', 'success');
        document.getElementById('breachesList').innerHTML = `
            <div class="history-list">
                ${result.breaches.map((breach) => `
                    <div class="history-item">
                        <div class="history-email">${escapeHtml(breach.email)}</div>
                        <div class="history-meta">Checked on ${escapeHtml(new Date(breach.checkedAt).toLocaleString())}</div>
                        <div class="chip-list">
                            ${(breach.sites || []).map((site) => `<span class="chip">${escapeHtml(site)}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        setMessage('breachesMessage', error.message, 'error');
        document.getElementById('breachesList').innerHTML = '';
    } finally {
        setLoading(button, false);
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
    resetAuthMessages();
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

function setAuthenticatedUI(authenticated, email = localStorage.getItem(USER_EMAIL_KEY) || '') {
    authStatus.textContent = authenticated ? `Signed in: ${email}` : 'Guest Mode';
    signUpLink.classList.toggle('hidden', authenticated);
    getStartedLink.classList.toggle('hidden', authenticated);
    logoutBtn.classList.toggle('hidden', !authenticated);

    authOnlySections.forEach((section) => {
        section.classList.toggle('show', authenticated);
    });

    document.getElementById('recentChecksSection').style.display = authenticated ? 'none' : 'block';

    if (!authenticated) {
        setMessage('breachMessage', '', '');
        setMessage('aiMessage', '', '');
        setMessage('breachesMessage', '', '');
        document.getElementById('breachResults').innerHTML = '';
        document.getElementById('aiResults').textContent = '';
        document.getElementById('breachesList').innerHTML = '';
        displayRecentChecks();
    }
}

async function performBreachCheck(email) {
    const button = document.querySelector('.hero-scan-btn');
    const dashboard = document.getElementById('breachDashboard');
    const statusText = document.querySelector('.status-text');

    setLoading(button, true);
    dashboard.classList.remove('hidden');
    dashboard.classList.add('show');
    statusText.textContent = 'Scanning...';
    statusText.className = 'status-text scanning';
    document.getElementById('scannedEmail').textContent = email;
    document.getElementById('lastChecked').textContent = new Date().toLocaleString();

    try {
        const result = await fetchBreachData(email);
        updateDashboard(result);
        renderBreachResults(result);
    } catch (error) {
        updateDashboard({
            checkedEmail: email,
            breached: false,
            breachCount: 0,
            breaches: [],
            explanation: error.message,
            suggestions: DEFAULT_SECURITY_STEPS,
            errored: true
        });
        setMessage('breachMessage', error.message, 'error');
        document.getElementById('breachResults').innerHTML = '';
    } finally {
        setLoading(button, false);
    }
}

function updateDashboard(result) {
    const breaches = result.breaches || [];
    const statusText = document.querySelector('.status-text');
    const breachList = document.getElementById('breachList');
    const riskFill = document.querySelector('.risk-fill');
    const riskText = document.querySelector('.risk-text');
    const recommendationsList = document.getElementById('recommendationsList');

    document.getElementById('scannedEmail').textContent = result.checkedEmail || '-';
    document.getElementById('lastChecked').textContent = new Date().toLocaleString();

    if (result.errored) {
        statusText.textContent = 'Check Failed';
        statusText.className = 'status-text breached';
    } else if (result.breached) {
        statusText.textContent = 'Breaches Found';
        statusText.className = 'status-text breached';
    } else {
        statusText.textContent = 'No Breaches Found';
        statusText.className = 'status-text safe';
    }

    if (breaches.length) {
        breachList.innerHTML = breaches.map((breach) => `
            <div class="breach-item">
                <div class="platform">${escapeHtml(breach.name)}</div>
                <div class="date">${escapeHtml(breach.domain || 'Domain unavailable')}</div>
            </div>
        `).join('');
    } else {
        breachList.innerHTML = `
            <div class="no-breaches">
                <div class="shield-mark" aria-hidden="true">OK</div>
                <p>${result.errored ? 'Unable to load breach details' : 'No breaches detected'}</p>
            </div>
        `;
    }

    const riskLevel = result.errored ? 15 : calculateRiskLevel(breaches.length);
    riskFill.style.width = `${riskLevel}%`;
    riskText.textContent = getRiskLabel(result.errored, breaches.length);

    const recommendations = (result.suggestions?.length ? result.suggestions : DEFAULT_SECURITY_STEPS)
        .map((suggestion) => `<li>${escapeHtml(suggestion)}</li>`)
        .join('');
    recommendationsList.innerHTML = recommendations;
}

function renderBreachResults(result) {
    const breaches = result.breaches || [];

    setMessage(
        'breachMessage',
        result.breached
            ? `Found ${result.breachCount} known breach ${result.breachCount === 1 ? 'record' : 'records'} for this email.`
            : 'No breaches were found for this email.',
        'success'
    );

    if (!breaches.length) {
        document.getElementById('breachResults').innerHTML = `
            <p class="empty-state">${escapeHtml(result.explanation || 'No breach details are available.')}</p>
        `;
        return;
    }

    document.getElementById('breachResults').innerHTML = `
        <div class="breach-summary">${escapeHtml(result.explanation)}</div>
        <div class="breach-records">
            ${breaches.map((breach) => `
                <div class="breach-record">
                    <div class="record-title">${escapeHtml(breach.name)}</div>
                    <div class="record-domain">${escapeHtml(breach.domain || 'Domain unavailable')}</div>
                    ${breach.dataClasses?.length ? `
                        <div class="chip-list">
                            ${breach.dataClasses.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        <ul class="suggestion-list">
            ${(result.suggestions || DEFAULT_SECURITY_STEPS).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
    `;
}

async function fetchBreachData(email) {
    const result = await fetchJson(`/breach/check-email/${encodeURIComponent(email)}`, {
        headers: buildHeaders(false)
    });

    if (!isAuthenticated()) {
        saveAnonymousCheck(result);
        displayRecentChecks();
    }

    return result;
}

function saveAnonymousCheck(result) {
    const existingChecks = getAnonymousChecks().filter((check) => check.email !== result.checkedEmail);
    existingChecks.unshift({
        email: result.checkedEmail,
        breachCount: result.breachCount,
        checkedAt: new Date().toISOString()
    });
    sessionStorage.setItem(ANONYMOUS_BREACHES_KEY, JSON.stringify(existingChecks.slice(0, 10)));
}

function getAnonymousChecks() {
    try {
        return JSON.parse(sessionStorage.getItem(ANONYMOUS_BREACHES_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

function displayRecentChecks() {
    const recent = getAnonymousChecks();
    const recentDiv = document.getElementById('recentChecks');

    if (!recent.length) {
        recentDiv.innerHTML = '<p class="empty-state">No recent checks in this tab yet.</p>';
        return;
    }

    recentDiv.innerHTML = `
        <ul>
            ${recent.map((check) => `
                <li>
                    <strong>${escapeHtml(check.email)}</strong> - ${escapeHtml(`${check.breachCount}`)} breach ${check.breachCount === 1 ? 'record' : 'records'} found
                    (${escapeHtml(new Date(check.checkedAt).toLocaleString())})
                </li>
            `).join('')}
        </ul>
    `;
}

function buildHeaders(includeJson = true, includeAuth = true) {
    const headers = {};

    if (includeJson) {
        headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    return headers;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    let payload = {};

    if (contentType.includes('application/json')) {
        payload = await response.json();
    } else {
        const text = await response.text();
        payload = text ? { message: text } : {};
    }

    if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Request failed.');
    }

    return payload;
}

function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

function isAuthenticated() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
}

function setLoading(button, isLoading) {
    if (!button) {
        return;
    }

    button.classList.toggle('loading', isLoading);
    button.disabled = isLoading;
}

function setMessage(elementId, text, tone) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.className = tone || '';
}

function resetAuthMessages() {
    setMessage('loginMessage', '', '');
    setMessage('registerMessage', '', '');
}

function calculateRiskLevel(breachCount) {
    if (breachCount === 0) {
        return 8;
    }

    if (breachCount === 1) {
        return 35;
    }

    if (breachCount <= 3) {
        return 60;
    }

    return 85;
}

function getRiskLabel(errored, breachCount) {
    if (errored) {
        return 'Unknown';
    }

    if (breachCount === 0) {
        return 'Low Risk';
    }

    if (breachCount === 1) {
        return 'Medium Risk';
    }

    if (breachCount <= 3) {
        return 'Elevated Risk';
    }

    return 'High Risk';
}

function escapeHtml(value) {
    return `${value}`
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.addEventListener('load', () => {
    setAuthenticatedUI(isAuthenticated());
    displayRecentChecks();
});
