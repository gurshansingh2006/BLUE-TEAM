// Navigation handlers
document.getElementById('signInLink').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('loginSection');
});

document.getElementById('getStartedLink').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('registerSection');
});

document.getElementById('registerLink').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('registerSection');
});

document.getElementById('backToLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('loginSection');
});

function showSection(sectionId) {
    // Hide all sections
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'none';
    // Show the selected section
    document.getElementById(sectionId).style.display = 'block';
    // Scroll to it
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('loginMessage').textContent = 'Login successful!';
            document.getElementById('loginMessage').style.color = 'green';
            localStorage.setItem('token', result.token);
            // Redirect or update UI
            setTimeout(() => {
                alert('Welcome to GUARDIUM!');
                // Hide form or redirect
                document.getElementById('loginSection').style.display = 'none';
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
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('registerMessage').textContent = 'Registration successful! Please sign in.';
            document.getElementById('registerMessage').style.color = 'green';
            // Switch to login
            setTimeout(() => {
                showSection('loginSection');
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