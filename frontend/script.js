document.querySelector('.hero-scan-btn').addEventListener('click', () => {
    const email = document.getElementById('heroEmail').value;
    if (email) {
        document.getElementById('breachEmail').value = email;
        document.getElementById('breachSection').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('checkBreachBtn').click();
    } else {
        alert('Please enter your email address first.');
    }
});

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

closeBtn.addEventListener('click', () => {
    closeModal();
});

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
            body: JSON.stringify({ username: email, password })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('loginMessage').textContent = 'Login successful!';
            document.getElementById('loginMessage').style.color = 'green';
            localStorage.setItem('token', result.token);
            setTimeout(() => {
                closeModal();
                alert('Welcome to GUARDIUM!');
                document.getElementById('breachSection').style.display = 'block';
                document.getElementById('aiSection').style.display = 'block';
                document.getElementById('userBreachesSection').style.display = 'block';
                document.getElementById('recentChecksSection').style.display = 'none';
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
            body: JSON.stringify({ username: email, password })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('registerMessage').textContent = 'Registration successful! Please sign in.';
            document.getElementById('registerMessage').style.color = 'green';
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

document.getElementById('checkBreachBtn').addEventListener('click', async () => {
    const email = document.getElementById('breachEmail').value;
    if (!email) {
        document.getElementById('breachMessage').textContent = 'Please enter an email.';
        document.getElementById('breachMessage').className = 'error';
        return;
    }
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const button = document.getElementById('checkBreachBtn');
    button.classList.add('loading');
    button.disabled = true;
    try {
        const response = await fetch(`/breach/check-email/${email}`, { headers });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('breachMessage').textContent = 'Breaches found!';
            document.getElementById('breachMessage').className = 'success';
            let html = '<ul>';
            result.breaches.forEach(breach => {
                html += `<li><strong>${breach.Name}</strong> (${breach.Domain}): ${breach.DataClasses.join(', ')}</li>`;
            });
            html += '</ul>';
            if (result.explanation) {
                html += `<h4>Explanation:</h4><p>${result.explanation}</p>`;
            }
            if (result.suggestions) {
                html += `<h4>Suggestions:</h4><p>${result.suggestions}</p>`;
            }
            document.getElementById('breachResults').innerHTML = html;
            const checkData = {
                email,
                breaches: result.breaches.map(b => ({ name: b.Name, domain: b.Domain, data: b.DataClasses })),
                checkedAt: new Date().toISOString()
            };
            if (token) {
            } else {
                const recent = JSON.parse(localStorage.getItem('anonymousBreaches') || '[]');
                recent.unshift(checkData);
                if (recent.length > 10) recent.pop();
                localStorage.setItem('anonymousBreaches', JSON.stringify(recent));
                displayRecentChecks();
            }
        } else {
            document.getElementById('breachMessage').textContent = 'No breaches found.';
            document.getElementById('breachMessage').className = 'success';
            document.getElementById('breachResults').innerHTML = '';
        }
    } catch (error) {
        document.getElementById('breachMessage').textContent = 'Error: ' + error.message;
        document.getElementById('breachMessage').className = 'error';
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
});

document.getElementById('getSuggestionBtn').addEventListener('click', async () => {
    const prompt = document.getElementById('aiPrompt').value;
    if (!prompt) {
        document.getElementById('aiMessage').textContent = 'Please enter a prompt.';
        document.getElementById('aiMessage').className = 'error';
        return;
    }
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const button = document.getElementById('getSuggestionBtn');
    button.classList.add('loading');
    button.disabled = true;
    try {
        const response = await fetch('/ai/suggest', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('aiMessage').textContent = 'Suggestion:';
            document.getElementById('aiMessage').className = 'success';
            document.getElementById('aiResults').textContent = result.suggestion;
        } else {
            document.getElementById('aiMessage').textContent = result.error;
            document.getElementById('aiMessage').className = 'error';
        }
    } catch (error) {
        document.getElementById('aiMessage').textContent = 'Error: ' + error.message;
        document.getElementById('aiMessage').className = 'error';
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
});

function displayRecentChecks() {
    const recent = JSON.parse(localStorage.getItem('anonymousBreaches') || '[]');
    const recentDiv = document.getElementById('recentChecks');
    if (recent.length === 0) {
        recentDiv.innerHTML = '<p>No recent checks.</p>';
        return;
    }
    let html = '<ul>';
    recent.forEach(check => {
        html += `<li><strong>${check.email}</strong> - ${check.breaches.length} breaches found (${new Date(check.checkedAt).toLocaleString()})</li>`;
    });
    html += '</ul>';
    recentDiv.innerHTML = html;
}

document.getElementById('loadBreachesBtn').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('breachesMessage').textContent = 'Please sign in to view your breaches.';
        document.getElementById('breachesMessage').className = 'error';
        return;
    }
    const button = document.getElementById('loadBreachesBtn');
    button.classList.add('loading');
    button.disabled = true;
    try {
        const response = await fetch('/auth/breaches', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('breachesMessage').textContent = 'Your breaches:';
            document.getElementById('breachesMessage').className = 'success';
            const breachesHtml = result.breaches.map(breach => 
                `<div><strong>${breach.email}</strong> - ${breach.sites.join(', ')} (checked on ${new Date(breach.checkedAt).toLocaleDateString()})</div>`
            ).join('');
            document.getElementById('breachesList').innerHTML = breachesHtml;
        } else {
            document.getElementById('breachesMessage').textContent = result.message;
            document.getElementById('breachesMessage').className = 'error';
        }
    } catch (error) {
        document.getElementById('breachesMessage').textContent = 'Error: ' + error.message;
        document.getElementById('breachesMessage').className = 'error';
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
});