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
    const menuList = document.getElementById('menuSection');
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
            console.error('Error editing item:', error);
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
            await fetchAndDisplayExtras
            ();
            document.getElementById('extrasForm').reset();
        }
    } catch (error) {
        console.error('Error adding extra:', error);
    }
}

async function editExtra(extraId) {
    const extraName = prompt("Enter new extra name:");
    const extraPrice = prompt("Enter new extra price (K):");
    const extraCategory = prompt("Enter new category (breakfast/lunch):");
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
            console.error('Error editing extra:', error);
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
    const pendingOrders = [];
    const preparingOrders = [];
    const readyOrders = [];
    const completedOrders = [];

    orders.forEach(order => {
        switch (order.status) {
            case 'pending':
                pendingOrders.push(order);
                break;
            case 'preparing':
                preparingOrders.push(order);
                break;
            case 'ready':
                readyOrders.push(order);
                break;
            case 'completed':
                completedOrders.push(order);
                break;
            default:
                console.warn(`Unknown status for order ${order.orderNumber}: ${order.status}`);
                break;
        }
    });

    displayOrders({
        pendingOrders,
        preparingOrders,
        readyOrders,
        completedOrders
    });
}

function displayOrders(orderCategories) {
    displayOrderCategory('pendingOrders', orderCategories.pendingOrders);
    displayOrderCategory('preparingOrders', orderCategories.preparingOrders);
    displayOrderCategory('readyOrders', orderCategories.readyOrders);
    displayOrderCategory('completedOrders', orderCategories.completedOrders);
}

function displayOrderCategory(categoryId, orders) {
    const orderList = document.getElementById(categoryId);
    if (!orders || !Array.isArray(orders)) {
        orderList.innerHTML = '<p>No orders available.</p>';
        return;
    }
    orderList.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <span>Order #${order.orderNumber}</span><br>
                <span>Payment Method: ${order.paymentMethod || 'N/A'}</span><br>
                <span>Name: ${order.name}</span><br>
                <span>Mobile Number: ${order.phoneNumber || 'N/A'}</span><br>
                <span>Delivery: ${order.delivery ? 'Yes' : 'No'}</span><br>
                <span>Total: K${order.total.toFixed(2)}</span><br>
                <span>Status: ${order.status}</span>
            </div>
            <div class="order-items">
                <h3>Ordered Items:</h3>
                <ul>
                    ${order.items ? order.items.map(item => `
                        <li>${item.name} (Quantity: ${item.quantity}) - K${(item.quantity * item.price).toFixed(2)}</li>
                    `).join('') : '<li>No items found</li>'}
                </ul>
            </div>
            <div class="order-actions">
                <button onclick="deleteOrder('${order.orderNumber}')">Delete</button>
                <button onclick="updateOrderStatus('${order.orderNumber}')">Update Status</button>
            </div>
        </div>
    `).join('');
}

async function deleteOrder(orderNumber) {
    try {
        const response = await fetch(`/api/orders/${orderNumber}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            await fetchAndDisplayOrders();
        }
    } catch (error) {
        console.error('Error deleting order:', error);
    }
}

async function updateOrderStatus(orderNumber) {
    const newStatus = prompt("Enter new status (e.g., pending, preparing, ready, completed):");
    if (newStatus) {
        try {
            const response = await fetch(`/api/orders/${orderNumber}/status`, {
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
}
