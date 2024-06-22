document.addEventListener('DOMContentLoaded', async () => {
    try {
        await fetchAndDisplayMenu();
        await fetchAndDisplayExtras();
        await fetchAndDisplayOrders();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
});

async function fetchAndDisplayMenu() {
    try {
        const menu = await fetchMenu();
        displayMenu(menu);
    } catch (error) {
        console.error('Error fetching menu:', error);
    }
}

async function fetchAndDisplayExtras() {
    try {
        const extras = await fetchExtras();
        displayExtras(extras);
    } catch (error) {
        console.error('Error fetching extras:', error);
    }
}

async function fetchAndDisplayOrders() {
    try {
        const orders = await fetchOrders();
        categorizeOrders(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

async function fetchMenu() {
    const response = await fetch('/api/menu');
    if (!response.ok) throw new Error('Failed to fetch menu');
    return response.json();
}

function displayMenu(menu) {
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = menu.map(item => `
        <div class="menu-item">
            <span>${item.name} (K${item.price.toFixed(2)})</span>
            <div>
                <button onclick="editItem('${item.id}')">Edit</button>
                <button onclick="deleteItem('${item.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addItem() {
    const itemName = document.getElementById('itemName').value;
    const itemPrice = parseFloat(document.getElementById('itemPrice').value);
    const newItem = {
        id: Date.now().toString(),
        name: itemName,
        price: itemPrice
    };

    try {
        const response = await fetch('/api/menu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newItem)
        });

        const result = await response.json();
        if (result.success) {
            await fetchAndDisplayMenu();
            document.getElementById('menuForm').reset();
        }
    } catch (error) {
        console.error('Error adding item:', error);
    }
}

async function editItem(itemId) {
    const itemName = prompt("Enter new item name:");
    const itemPrice = prompt("Enter new item price (K):");
    if (itemName !== null && itemPrice !== null) {
        const updatedItem = {
            id: itemId,
            name: itemName,
            price: parseFloat(itemPrice)
        };

        try {
            const response = await fetch(`/api/menu/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedItem)
            });

            const result = await response.json();
            if (result.success) {
                await fetchAndDisplayMenu();
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    }
}

async function deleteItem(itemId) {
    try {
        const response = await fetch(`/api/menu/${itemId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            await fetchAndDisplayMenu();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
    }
}

async function fetchExtras() {
    const response = await fetch('/api/extras');
    if (!response.ok) throw new Error('Failed to fetch extras');
    return response.json();
}

function displayExtras(extras) {
    const extrasList = document.getElementById('extrasList');
    extrasList.innerHTML = extras.map(extra => `
        <div class="extra-item">
            <span>${extra.name} (K${extra.price.toFixed(2)})</span>
            <div>
                <button onclick="editExtra('${extra.id}')">Edit</button>
                <button onclick="deleteExtra('${extra.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addExtra() {
    const extraName = document.getElementById('extraName').value;
    const extraPrice = parseFloat(document.getElementById('extraPrice').value);
    const extraCategory = document.getElementById('extraCategory').value;
    const newExtra = {
        id: Date.now().toString(),
        name: extraName,
        price: extraPrice,
        category: extraCategory
    };

    try {
        const response = await fetch('/api/extras', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newExtra)
        });

        const result = await response.json();
        if (result.success) {
            await fetchAndDisplayExtras();
            document.getElementById('extrasForm').reset();
        }
    } catch (error) {
        console.error('Error adding extra:', error);
    }
}

async function editExtra(extraId) {
    const extraName = prompt("Enter new extra name:");
    const extraPrice = prompt("Enter new extra price (K):");
    const extraCategory = prompt("Enter new extra category:");
    if (extraName !== null && extraPrice !== null && extraCategory !== null) {
        const updatedExtra = {
            id: extraId,
            name: extraName,
            price: parseFloat(extraPrice),
            category: extraCategory
        };

        try {
            const response = await fetch(`/api/extras/${extraId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedExtra)
            });

            const result = await response.json();
            if (result.success) {
                await fetchAndDisplayExtras();
            }
        } catch (error) {
            console.error('Error updating extra:', error);
        }
    }
}

async function deleteExtra(extraId) {
    try {
        const response = await fetch(`/api/extras/${extraId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            await fetchAndDisplayExtras();
        }
    } catch (error) {
        console.error('Error deleting extra:', error);
    }
}

async function fetchOrders() {
    const response = await fetch('/api/orders');
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
}

function categorizeOrders(orders) {
    const pendingOrders = orders.filter(order => order.status === 'pending');
    const preparingOrders = orders.filter(order => order.status === 'preparing');
    const readyOrders = orders.filter(order => order.status === 'ready');
    const completedOrders = orders.filter(order => order.status === 'completed');

    displayOrders(pendingOrders, 'pendingOrderList');
    displayOrders(preparingOrders, 'preparingOrderList');
    displayOrders(readyOrders, 'readyOrderList');
    displayOrders(completedOrders, 'completedOrderList');
}

function displayOrders(orders, elementId) {
    const orderList = document.getElementById(elementId);
    orderList.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderNumber}</td>
            <td>${order.name}</td>
            <td>${order.total.toFixed(2)}</td>
            <td>
                <button onclick="updateOrderStatus('${order.id}', 'preparing')">Prepare</button>
                <button onclick="updateOrderStatus('${order.id}', 'ready')">Ready</button>
                <button onclick="updateOrderStatus('${order.id}', 'completed')">Complete</button>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const result = await response.json();
        if (result.success) {
            await fetchAndDisplayOrders();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

function logout() {
    // Clear authentication tokens or session data as needed
    fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/login.html'; // Redirect to the login page
        } else {
            console.error('Logout failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
