async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('token', result.token);
            window.location.href = './admin.html';
        } else {
            document.getElementById('loginError').innerText = 'Invalid username or password';
        }
    } catch (error) {
        console.error('Error logging in:', error);
        document.getElementById('loginError').innerText = 'Failed to login';
    }
}
