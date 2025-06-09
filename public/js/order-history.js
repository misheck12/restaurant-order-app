document.addEventListener('DOMContentLoaded', function() {
    const loginPrompt = document.getElementById('loginPrompt');
    const orderHistory = document.getElementById('orderHistory');
    const loading = document.getElementById('loading');
    const noOrders = document.getElementById('noOrders');
    const ordersList = document.getElementById('ordersList');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check if user is logged in
    function checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showLoginPrompt();
            return false;
        }
        return true;
    }

    function showLoginPrompt() {
        loginPrompt.classList.remove('hidden');
        orderHistory.classList.add('hidden');
    }

    // Fetch order history
    async function loadOrderHistory() {
        const token = localStorage.getItem('authToken');
        
        try {
            const response = await fetch('/api/orders/history', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch order history');
            }

            const orders = await response.json();
            displayOrders(orders);
        } catch (error) {
            console.error('Error loading order history:', error);
            loading.textContent = 'Error loading order history. Please try again.';
        }
    }

    // Display orders
    function displayOrders(orders) {
        loading.classList.add('hidden');
        
        if (orders.length === 0) {
            noOrders.classList.remove('hidden');
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <h3>Order #${order.id}</h3>
                    <span class="order-date">${new Date(order.createdAt).toLocaleDateString()}</span>
                    <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-name">${item.name}</span>
                            <span class="item-quantity">x${item.quantity}</span>
                            <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <div class="order-total">
                        <strong>Total: $${order.total.toFixed(2)}</strong>
                    </div>
                    <button class="btn btn-primary reorder-btn" data-order-id="${order.id}">
                        Reorder
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for reorder buttons
        document.querySelectorAll('.reorder-btn').forEach(btn => {
            btn.addEventListener('click', handleReorder);
        });
    }

    // Handle reorder
    async function handleReorder(event) {
        const orderId = event.target.dataset.orderId;
        const btn = event.target;
        
        btn.disabled = true;
        btn.textContent = 'Adding to cart...';

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/orders/${orderId}/reorder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to reorder');
            }

            btn.textContent = 'Added to cart!';
            btn.classList.add('success');
            
            // Show success message and option to go to cart
            setTimeout(() => {
                if (confirm('Items added to cart! Would you like to view your cart?')) {
                    window.location.href = 'cart.html';
                }
                btn.disabled = false;
                btn.textContent = 'Reorder';
                btn.classList.remove('success');
            }, 1500);

        } catch (error) {
            console.error('Error reordering:', error);
            btn.textContent = 'Error - Try again';
            btn.disabled = false;
            setTimeout(() => {
                btn.textContent = 'Reorder';
            }, 2000);
        }
    }

    // Logout functionality
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html';
    });

    // Initialize page
    if (checkAuth()) {
        loadOrderHistory();
    }
});
