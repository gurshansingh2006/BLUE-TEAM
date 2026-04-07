document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (response.ok) {
            document.getElementById('message').textContent = 'Login successful!';
            localStorage.setItem('token', result.token);
        } else {
            document.getElementById('message').textContent = result.message;
        }
    } catch (error) {
        document.getElementById('message').textContent = 'Error: ' + error.message;
    }
});