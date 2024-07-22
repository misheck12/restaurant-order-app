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
    try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Permission denied: You do not have access to the menu.');
            }
            throw new Error(`Failed to fetch menu: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching menu:', error);
        throw error;
    }
}

async function fetchExtras() {
    try {
        const response = await fetch('/api/extras');
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Permission denied: You do not have access to the extras.');
            }
            throw new Error(`Failed to fetch extras: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching extras:', error);
        throw error;
    }
}

function displayItems(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => {
        const priceText = item.price ? `(K${item.price.toFixed(2)} each)` : ''; 
        return `
            <div class="menu-card">
                <div class="menu-card-content">
                    <span>${item.name} ${priceText}</span>
                    <div class="quantity-controls">
                        <button type="button" onclick="updateQuantity('${item.id}', -1)" class="quantity-button">-</button>
                        <span id="quantity-${item.id}" class="quantity">0</span>
                        <button type="button" onclick="updateQuantity('${item.id}', 1)" class="quantity-button">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateQuantity(itemId, change) {
    const quantityElement = document.getElementById(`quantity-${itemId}`);
    let quantity = parseInt(quantityElement.innerText) || 0;
    quantity = Math.max(0, quantity + change);
    quantityElement.innerText = quantity;
}

function calculateTotal() {
    const serviceFee = 2;
    let deliveryFee = 5; // Default fee for GRU campus
    const deliveryOnGru = document.getElementById('delivery').checked;
    const deliveryOutsideGru = document.getElementById('deliveryOutsideGru').checked;

    if (deliveryOutsideGru) {
        deliveryFee = 22; // Fee for outside GRU campus
    }

    let total = serviceFee + deliveryFee;

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
        delivery: document.getElementById('delivery').checked || document.getElementById('deliveryOutsideGru').checked,
        total
    };

    localStorage.setItem('order', JSON.stringify(order));
    window.location.href = '/checkout.html';
}
