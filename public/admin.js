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

    if (!itemName || isNaN(itemPrice)) {
        alert('Please enter valid item name and price.');
        return;
    }

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

    if (itemName === null || itemPrice === null || isNaN(parseFloat(itemPrice))) {
        alert('Invalid input. Please try again.');
        return;
    }

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
            <span>${extra.name} (K${extra.price.toFixed(2)}) - ${extra.category}</span>
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

    if (!extraName || isNaN(extraPrice) || !extraCategory) {
        alert('Please enter valid extra name, price, and category.');
        return;
    }

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

    if (extraName === null || extraPrice === null || isNaN(parseFloat(extraPrice)) || extraCategory === null) {
        alert('Invalid input. Please try again.');
        return;
    }

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
    const pendingOrderList = document.getElementById('pendingOrderList');
    const preparingOrderList = document.getElementById('preparingOrderList');
    const readyOrderList = document.getElementById('readyOrderList');
    const completedOrderList = document.getElementById('completedOrderList');

    pendingOrderList.innerHTML = '';
    preparingOrderList.innerHTML = '';
    readyOrderList.innerHTML = '';
    completedOrderList.innerHTML = '';

    orders.forEach(order => {
        const orderRow = `
            <tr>
                <td>${order.orderNumber}</td>
                <td>${order.customerName}</td>
                <td>K${order.total.toFixed(2)}</td>
                <td>
                    ${order.status === 'pending' ? `<button onclick="updateOrderStatus('${order.id}', 'preparing')">Start Preparing</button>` : ''}
                    ${order.status === 'preparing' ? `<button onclick="updateOrderStatus('${order.id}', 'ready')">Ready</button>` : ''}
                    ${order.status === 'ready' ? `<button onclick="updateOrderStatus('${order.id}', 'completed')">Complete</button>` : ''}
                </td>
            </tr>
        `;
        switch (order.status) {
            case 'pending':
                pendingOrderList.innerHTML += orderRow;
                break;
            case 'preparing':
                preparingOrderList.innerHTML += orderRow;
                break;
            case 'ready':
                readyOrderList.innerHTML += orderRow;
                break;
            case 'completed':
                completedOrderList.innerHTML += orderRow;
                break;
        }
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
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
