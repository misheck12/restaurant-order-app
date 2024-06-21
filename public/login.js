async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok) {
            loginError.textContent = '';
            window.location.href = '/admin.html';
        } else {
            loginError.textContent = result.message;
        }
    } catch (error) {
        console.error('Error:', error);
        loginError.textContent = 'An error occurred while trying to log in. Please try again later.';
    }
}
