document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [menu, extras] = await Promise.all([fetchMenu(), fetchExtras()]);
        displayItems(menu, 'menuContainer');
        displayItems(extras, 'extrasContainer');
    } catch (error) {
        console.error('Error fetching and displaying data:', error);
    }
});

async function fetchMenu() {
    const response = await fetch('/api/menu');
    if (!response.ok) throw new Error(`Failed to fetch menu: ${response.statusText}`);
    return response.json();
}

async function fetchExtras() {
    const response = await fetch('/api/extras');
    if (!response.ok) throw new Error(`Failed to fetch extras: ${response.statusText}`);
    return response.json();
}

function displayItems(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => `
        <div class="menu-card">
            <div class="menu-card-content">
                <span>${item.name} (K${item.price.toFixed(2)} each)</span>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.id}', -1)" class="quantity-button">-</button>
                    <span id="quantity-${item.id}" class="quantity">0</span>
                    <button onclick="updateQuantity('${item.id}', 1)" class="quantity-button">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateQuantity(itemId, change) {
    const quantityElement = document.getElementById(`quantity-${itemId}`);
    let quantity = parseInt(quantityElement.innerText) || 0;
    quantity = Math.max(0, quantity + change);
    quantityElement.innerText = quantity;
}

function calculateTotal() {
    let deliveryFee = 0;
    const deliveryOnGru = document.getElementById('deliveryGru').checked;
    const deliveryOutsideGru = document.getElementById('deliveryOutsideGru').checked;

    if (deliveryOnGru) {
        deliveryFee = 5;
    } else if (deliveryOutsideGru) {
        deliveryFee = 22;
    }

    let total = deliveryFee;

    document.querySelectorAll('.menu-card').forEach(card => {
        const price = parseFloat(card.querySelector('.menu-card-content span').innerText.match(/K(\d+(\.\d+)?)/)[1]);
        const quantity = parseInt(card.querySelector('.quantity-controls span').innerText) || 0;
        total += price * quantity;
    });

    return total;
}

function proceedToCheckout() {
    const total = calculateTotal();
    const items = [];
    document.querySelectorAll('.menu-card').forEach(card => {
        const quantity = parseInt(card.querySelector('.quantity-controls span').innerText) || 0;
        if (quantity > 0) {
            items.push({
                name: card.querySelector('.menu-card-content span').innerText.split(' (')[0],
                quantity,
                price: parseFloat(card.querySelector('.menu-card-content span').innerText.match(/K(\d+(\.\d+)?)/)[1])
            });
        }
    });

    const order = {
        items,
        delivery: document.getElementById('deliveryGru').checked || document.getElementById('deliveryOutsideGru').checked,
        total
    };

    localStorage.setItem('order', JSON.stringify(order));
    window.location.href = '/checkout.html';
}
