const TOKEN_KEY = 'token';
const USER_EMAIL_KEY = 'userEmail';
const ANONYMOUS_BREACHES_KEY = 'anonymousBreaches';
const DEFAULT_SECURITY_STEPS = [
    'Use unique passwords for each account.',
    'Enable two-factor authentication wherever it is available.',
    'Review sensitive accounts for suspicious sign-ins or password reset emails.'
];
const MAX_VISIBLE_BREACHES = 8;

// New elements
const scanningOverlay = document.getElementById('scanningOverlay');
const darkWebScan = document.getElementById('darkWebScan');
const aiAssistant = document.getElementById('aiAssistant');
const aiChat = document.getElementById('aiChat');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiChatInput = document.getElementById('aiChatInput');

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

    if (!email) {
        setMessage('breachMessage', 'Please enter an email address.', 'error');
        return;
    }

    await performBreachCheck(email);
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
    // Determine which button was clicked
    const heroButton = document.querySelector('.hero-scan-btn');
    const breachButton = document.getElementById('checkBreachBtn');
    const button = heroButton || breachButton;

    const dashboard = document.getElementById('breachDashboard');
    const statusText = document.querySelector('.status-text');

    setLoading(button, true);
    dashboard.classList.remove('hidden');
    dashboard.classList.add('show');
    statusText.textContent = 'Scanning...';
    statusText.className = 'status-text scanning';
    document.getElementById('scannedEmail').textContent = email;
    document.getElementById('lastChecked').textContent = new Date().toLocaleString();

    // Update hero email if it exists
    const heroEmail = document.getElementById('heroEmail');
    if (heroEmail) {
        heroEmail.value = email;
    }

    // Show scanning animation
    await showScanningAnimation();

    try {
        const result = await fetchBreachData(email);
        updateDashboard(result);
        renderBreachResults(result);

        // Scroll to breach section if not already there
        if (heroButton) {
            document.getElementById('breachSection').scrollIntoView({ behavior: 'smooth' });
        }
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
    const analysis = getAnalysis(result);
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
        const visibleBreaches = breaches.slice(0, MAX_VISIBLE_BREACHES);
        const extraCount = Math.max(0, (result.totalBreachesAvailable || breaches.length) - visibleBreaches.length);

        breachList.innerHTML = visibleBreaches.map((breach) => `
            <div class="breach-item">
                <div class="platform">${escapeHtml(breach.name)}</div>
                <div class="date">${escapeHtml(breach.exposedDate || breach.domain || 'Details available below')}</div>
            </div>
        `).join('') + (extraCount ? `<div class="breach-more">+ ${escapeHtml(`${extraCount}`)} more breach records in the full analysis</div>` : '');
    } else {
        breachList.innerHTML = `
            <div class="no-breaches">
                <div class="shield-mark" aria-hidden="true">OK</div>
                <p>${result.errored ? 'Unable to load breach details' : 'No breaches detected'}</p>
            </div>
        `;
    }

    const riskScore = result.errored ? 2 : (analysis.riskScore || calculateRiskLevel(breaches.length));
    riskFill.style.width = `${Math.min(100, riskScore * 10)}%`;
    riskText.textContent = `${analysis.riskLevel || getRiskLabel(result.errored, breaches.length)} • ${riskScore}/10`;

    // Add risk score circle
    const riskCircle = document.querySelector('.risk-circle') || createRiskCircle();
    updateRiskCircle(riskCircle, riskScore);

    const recommendations = (analysis.immediateActions?.length ? analysis.immediateActions : DEFAULT_SECURITY_STEPS)
        .map((suggestion) => `<li>${escapeHtml(suggestion)}</li>`)
        .join('');
    recommendationsList.innerHTML = recommendations;
}

function createRiskCircle() {
    const dashboard = document.getElementById('breachDashboard');
    const riskSection = document.createElement('div');
    riskSection.className = 'risk-section';
    riskSection.innerHTML = `
        <div class="risk-circle">
            <span class="risk-score-text">0/10</span>
        </div>
        <p class="risk-description">Security Risk Level</p>
    `;
    dashboard.insertBefore(riskSection, dashboard.firstChild);
    return riskSection.querySelector('.risk-circle');
}

function updateRiskCircle(circle, score) {
    const scoreText = circle.querySelector('.risk-score-text');
    scoreText.textContent = `${score}/10`;

    circle.className = 'risk-circle';
    if (score <= 3) {
        circle.classList.add('safe');
    } else if (score <= 7) {
        circle.classList.add('warning');
    } else {
        circle.classList.add('danger');
    }
}

function renderBreachResults(result) {
    const breaches = result.breaches || [];
    const analysis = getAnalysis(result);
    const breachSources = result.breachSources || breaches.map((breach) => breach.name);
    const exposedData = result.exposedData || [];

    // Add AI thinking effect
    setMessage('breachMessage', '<span class="ai-thinking">AI is analyzing your results...</span>', 'success', true);

    setTimeout(() => {
        setMessage(
            'breachMessage',
            result.breached
                ? `Found ${result.breachCount} known breach ${result.breachCount === 1 ? 'record' : 'records'} for this email.`
                : 'No breaches were found for this email.',
            'success'
        );
    }, 2000);

    if (!breaches.length) {
        document.getElementById('breachResults').innerHTML = `
            <div class="analysis-section">
                <h4>DATA BREACH SUMMARY</h4>
                <p class="empty-state">${escapeHtml(analysis.summary || 'No breach details are available.')}</p>
            </div>
            <div class="analysis-section">
                <h4>SECURITY RISK LEVEL</h4>
                <p><strong>Risk Score:</strong> ${escapeHtml(`${analysis.riskScore || 1}/10`)}</p>
                <p class="analysis-text">${escapeHtml(analysis.riskExplanation || 'No active breach records were detected in this lookup.')}</p>
            </div>
        `;
        return;
    }

    const visibleSources = breachSources.slice(0, 12);
    const moreSources = Math.max(0, breachSources.length - visibleSources.length);

    document.getElementById('breachResults').innerHTML = `
        <div class="analysis-section">
            <h4>DATA BREACH SUMMARY</h4>
            <p class="analysis-text">${escapeHtml(analysis.summary)}</p>
            <div class="chip-list">
                ${visibleSources.map((source) => `<span class="chip">${escapeHtml(source)}</span>`).join('')}
                ${moreSources ? `<span class="chip chip-muted">+ ${escapeHtml(`${moreSources}`)} more</span>` : ''}
            </div>
            ${exposedData.length ? `
                <div class="analysis-subtitle">Types of data exposed</div>
                <div class="chip-list">
                    ${exposedData.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        <div class="analysis-section">
            <h4>SECURITY RISK LEVEL</h4>
            <p><strong>Risk Score:</strong> ${escapeHtml(`${analysis.riskScore}/10`)}</p>
            <p class="analysis-text">${escapeHtml(analysis.riskExplanation)}</p>
        </div>
        <div class="analysis-section">
            <h4>POSSIBLE THREATS</h4>
            <ul class="suggestion-list">
                ${analysis.possibleThreats.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>
        <div class="analysis-section">
            <h4>IMMEDIATE ACTIONS</h4>
            <ol class="action-list">
                ${analysis.immediateActions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ol>
        </div>
        <div class="analysis-section">
            <h4>FUTURE SECURITY RECOMMENDATIONS</h4>
            <ul class="suggestion-list">
                ${analysis.futureRecommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>
        <div class="breach-records">
            ${breaches.map((breach) => `
                <div class="breach-record">
                    <div class="record-title">${escapeHtml(breach.name)}</div>
                    <div class="record-domain">${escapeHtml(breach.domain || 'Domain unavailable')}</div>
                    ${breach.details ? `<div class="record-details">${escapeHtml(breach.details)}</div>` : ''}
                    ${breach.dataClasses?.length ? `
                        <div class="chip-list">
                            ${breach.dataClasses.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
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

function setMessage(elementId, text, tone, allowHtml = false) {
    const element = document.getElementById(elementId);
    if (allowHtml) {
        element.innerHTML = text;
    } else {
        element.textContent = text;
    }
    element.className = tone || '';
}

function resetAuthMessages() {
    setMessage('loginMessage', '', '');
    setMessage('registerMessage', '', '');
}

function calculateRiskLevel(breachCount) {
    if (breachCount === 0) {
        return 1;
    }

    if (breachCount === 1) {
        return 4;
    }

    if (breachCount <= 3) {
        return 7;
    }

    return 9;
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

function getAnalysis(result) {
    if (result.analysis) {
        return {
            summary: result.analysis.summary || '',
            riskScore: result.analysis.riskScore || calculateRiskLevel(result.breachCount || 0),
            riskLevel: result.analysis.riskLevel || getRiskLabel(false, result.breachCount || 0).replace(' Risk', '').toUpperCase(),
            riskExplanation: result.analysis.riskExplanation || '',
            possibleThreats: result.analysis.possibleThreats?.length ? result.analysis.possibleThreats : ['Attackers may use the leaked details to target you with phishing or account takeover attempts.'],
            immediateActions: result.analysis.immediateActions?.length ? result.analysis.immediateActions : DEFAULT_SECURITY_STEPS,
            futureRecommendations: result.analysis.futureRecommendations?.length ? result.analysis.futureRecommendations : DEFAULT_SECURITY_STEPS
        };
    }

    return {
        summary: result.breached ? 'This email appears in known breach records.' : 'No known breach records were found in this lookup.',
        riskScore: calculateRiskLevel(result.breachCount || 0),
        riskLevel: getRiskLabel(false, result.breachCount || 0).replace(' Risk', '').toUpperCase(),
        riskExplanation: result.breached ? 'This result still deserves attention because exposed profile data can be reused in future attacks.' : 'This result is currently low risk because no breach records were returned.',
        possibleThreats: ['Attackers may use leaked details for phishing, impersonation, or account takeover attempts.'],
        immediateActions: DEFAULT_SECURITY_STEPS,
        futureRecommendations: DEFAULT_SECURITY_STEPS
    };
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
    initializeParticles();
    initializeScrollEffects();
    initializeAIAssistant();
    initializePageAnimations();
});

// New initialization functions
function initializeParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 6 + 2) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDelay = (Math.random() * 20) + 's';
        particle.style.animationDuration = (Math.random() * 10 + 20) + 's';
        particlesContainer.appendChild(particle);
    }
}

function initializeScrollEffects() {
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

function initializeAIAssistant() {
    // AI Assistant functionality
    const aiAssistant = document.getElementById('aiAssistant');
    const aiChat = document.getElementById('aiChat');

    if (aiAssistant && aiChat) {
        aiAssistant.addEventListener('click', () => {
            aiChat.classList.toggle('active');
        });
    }
}

function initializeScrollEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScrollY = currentScrollY;
    });
}

function initializeAIAssistant() {
    aiAssistant.addEventListener('click', () => {
        aiChat.classList.toggle('active');
    });

    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = aiChatInput.value.trim();
            if (message) {
                addAIMessage('user', message);
                aiChatInput.value = '';

                // Simulate AI response
                setTimeout(() => {
                    const responses = [
                        "That's a great question! For better security, always use unique passwords and enable 2FA.",
                        "I recommend using a password manager to generate strong, unique passwords for each account.",
                        "Regular security audits and monitoring your accounts for suspicious activity is crucial.",
                        "Never share your passwords or personal information on suspicious websites or emails."
                    ];
                    addAIMessage('ai', responses[Math.floor(Math.random() * responses.length)]);
                }, 1000);
            }
        }
    });
}

function addAIMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;
    messageDiv.textContent = text;
    aiChatMessages.appendChild(messageDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

function initializePageAnimations() {
    // Add fade-in animation to sections
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        section.classList.add('fade-in');
        section.style.animationDelay = (index * 0.1) + 's';
    });

    // Add stagger animation to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.classList.add('stagger-animation');
    });
}

// Enhanced scanning animation
async function showScanningAnimation() {
    const overlay = scanningOverlay;
    const progressFill = document.getElementById('progressFill');
    const steps = [
        document.getElementById('step1'),
        document.getElementById('step2'),
        document.getElementById('step3'),
        document.getElementById('step4')
    ];

    overlay.classList.add('active');

    const scanningTexts = [
        'Scanning breach databases...',
        'Connecting to breach databases...',
        'Analyzing patterns...',
        'Generating AI recommendations...'
    ];

    for (let i = 0; i < steps.length; i++) {
        document.getElementById('scanningText').textContent = scanningTexts[i];
        steps.forEach(step => step.classList.remove('active'));
        steps[i].classList.add('active');

        const progress = ((i + 1) / steps.length) * 100;
        progressFill.style.width = progress + '%';

        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Show dark web scan simulation
    await showDarkWebScan();

    overlay.classList.remove('active');
}

async function showDarkWebScan() {
    darkWebScan.classList.add('active');
    const terminalText = document.getElementById('terminalText');

    const commands = [
        '> Connecting to TOR network...',
        '> Establishing secure tunnel...',
        '> Scanning dark web databases...',
        '> Searching for leaked credentials...',
        '> Analyzing breach patterns...',
        '> Cross-referencing with known dumps...',
        '> Generating security report...',
        '> Scan complete. No additional breaches found.'
    ];

    for (const command of commands) {
        terminalText.textContent += command + '\n';
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    darkWebScan.classList.remove('active');
    terminalText.textContent = '';
}
