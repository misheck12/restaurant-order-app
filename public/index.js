// UI helper functions for spinner overlay and toast notifications
function showSpinner(show) {
    const overlay = document.getElementById('spinnerOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toastId = `toast-${Date.now()}`;
    const bgClass = type === 'success' ? 'bg-success text-white' :
                    type === 'error'   ? 'bg-danger text-white'  :
                    type === 'info'    ? 'bg-info text-white'   :
                                         'bg-secondary text-white';
    const toastHtml = `
    <div id="${toastId}" class="toast ${bgClass}" role="alert" aria-live="assertive" aria-atomic="true" data-delay="3000">
      <div class="toast-body">
        ${message}
      </div>
    </div>`;
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    $(`#${toastId}`).toast('show').on('hidden.bs.toast', function() {
        this.remove();
    });
}

// Initialize app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuthStatus();
        await fetchAndDisplayMenu();
        await fetchAndDisplayExtras();
    } catch (error) {
        console.error('Error fetching and displaying data:', error);
    }

    // Polling: refresh menu and extras every 30 seconds
    setInterval(async () => {
        try {
            await fetchAndDisplayMenu();
            await fetchAndDisplayExtras();
        } catch (error) {
            console.error('Error polling data:', error);
        }
    }, 30000);

    // Search filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', filterMenu);

    // Update summary on delivery option change
    ['deliveryGru', 'deliveryOutsideGru'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateSummary);
    });

    // Initial summary
    updateSummary();
});

// Global variables
let currentUser = null;
let currentPromo = null;
let allMenuItems = [];
let allExtrasItems = [];

// Authentication functions
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateAuthUI();
        }
    } catch (error) {
        console.log('User not logged in');
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const historyLink = document.getElementById('historyLink');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userInfo.textContent = `Welcome, ${currentUser.name}`;
        historyLink.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        historyLink.style.display = 'none';
    }
}

function showLoginModal() {
    $('#loginModal').modal('show');
}

async function handleLogin() {
    const phone = document.getElementById('loginPhone').value;
    const name = document.getElementById('loginName').value;
    
    if (!phone || !name) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showSpinner(true);
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, name })
        });
        
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            updateAuthUI();
            $('#loginModal').modal('hide');
            showToast('Login successful!', 'success');
            await fetchAndDisplayMenu(); // Refresh to show favorites
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Login failed', 'error');
    } finally {
        showSpinner(false);
    }
}

async function handleLogout() {
    try {
        await fetch('/api/users/logout', { method: 'POST' });
        currentUser = null;
        updateAuthUI();
        showToast('Logged out successfully', 'info');
        await fetchAndDisplayMenu(); // Refresh to hide favorites
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

async function fetchAndDisplayMenu() {
    showSpinner(true);
    try {
        const menu = await fetchMenu();
        allMenuItems = menu;
        displayMenuWithCategories(menu);
    } catch (error) {
        showToast('Failed to load menu', 'error');
    } finally {
        showSpinner(false);
    }
}

async function fetchAndDisplayExtras() {
    showSpinner(true);
    try {
        const extras = await fetchExtras();
        allExtrasItems = extras;
        displayItems(extras, 'extrasContainer');
    } catch (error) {
        showToast('Failed to load extras', 'error');
    } finally {
        showSpinner(false);
    }
}

async function fetchMenu() {
    try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Permission denied: You do not have access to the menu.');
            }
            throw new Error(`Failed to fetch menu: ${response.statusText}`);
        }
        return await response.json();
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
        return await response.json();
    } catch (error) {
        console.error('Error fetching extras:', error);
        throw error;
    }
}

// Display menu with categories
function displayMenuWithCategories(items) {
    // Get unique categories
    const categories = [...new Set(items.map(item => item.category || 'Other'))];
    
    // Update category tabs
    const tabsContainer = document.getElementById('categoryTabs');
    const contentContainer = document.getElementById('categoryContent');
    
    // Clear existing tabs except "All"
    while (tabsContainer.children.length > 1) {
        tabsContainer.removeChild(tabsContainer.lastChild);
    }
    
    // Clear existing content except "all" tab
    const allTab = document.getElementById('all');
    contentContainer.innerHTML = '';
    contentContainer.appendChild(allTab);
    
    // Add category tabs and content
    categories.forEach(category => {
        const tabId = category.toLowerCase().replace(/\s+/g, '-');
        
        // Create tab
        const tabLi = document.createElement('li');
        tabLi.className = 'nav-item';
        tabLi.innerHTML = `<a class="nav-link" id="${tabId}-tab" data-toggle="tab" href="#${tabId}" role="tab">${category}</a>`;
        tabsContainer.appendChild(tabLi);
        
        // Create content
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-pane fade';
        tabContent.id = tabId;
        tabContent.setAttribute('role', 'tabpanel');
        tabContent.innerHTML = `<div class="menu-container" id="${tabId}-container"></div>`;
        contentContainer.appendChild(tabContent);
        
        // Display items for this category
        const categoryItems = items.filter(item => (item.category || 'Other') === category);
        displayItems(categoryItems, `${tabId}-container`);
    });
    
    // Display all items in the "All" tab
    displayItems(items, 'menuContainer');
}

function displayItems(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id ${containerId} not found`);
        return;
    }
    container.innerHTML = items.map(item => {
        const priceText = item.price ? `(K${item.price.toFixed(2)} each)` : ''; 
        const isFavorite = currentUser && currentUser.favorites.includes(item.id);
        const favoriteBtn = currentUser ? 
            `<button type="button" class="btn btn-sm ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}" onclick="toggleFavorite('${item.id}')" title="Add to favorites">
                <span class="heart">${isFavorite ? '❤️' : '🤍'}</span>
            </button>` : '';
        const description = item.description ? `<small class="text-muted d-block">${item.description}</small>` : '';
        
         return `
             <div class="menu-card">
                 <div class="menu-card-content">
                    <div class="item-details">
                        <span class="item-name">${item.name} ${priceText}</span>
                        ${description}
                    </div>
                    <div class="item-actions">
                        ${favoriteBtn}
                    </div>
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
    if (!quantityElement) {
        console.error(`Quantity element for item ${itemId} not found`);
        return;
    }
    let quantity = parseInt(quantityElement.innerText) || 0;
    quantity = Math.max(0, quantity + change);
    quantityElement.innerText = quantity;
    updateSummary();
}

// Filter menu and extras by search term
function filterMenu() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.menu-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
    });
}

// Update order summary section
function updateSummary() {
    const summaryItems = [];
    document.querySelectorAll('.menu-card').forEach(card => {
        const qty = parseInt(card.querySelector('.quantity').innerText) || 0;
        if (qty > 0) {
            const name = card.querySelector('.item-name').innerText.split(' (')[0];
            const priceMatch = card.querySelector('.item-name').innerText.match(/K(\d+(\.\d+)?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
            summaryItems.push({ name, quantity: qty, price });
        }
    });
    const summaryContainer = document.getElementById('summaryItems');
    summaryContainer.innerHTML = summaryItems.map(item =>
        `<div>${item.name} x${item.quantity}: K${(item.price * item.quantity).toFixed(2)}</div>`
    ).join('') || '<div>No items selected</div>';
    
    const total = calculateTotal();
    let totalsHtml = `Total: K${total.toFixed(2)}`;
    
    if (currentPromo) {
        totalsHtml += `<br><small class="text-success">Promo "${currentPromo.code}" applied</small>`;
    }
    
    document.getElementById('summaryTotals').innerHTML = totalsHtml;
    updateCheckoutButton();
}

function calculateTotal() {
    const serviceFee = 2;
    let deliveryFee = 0;

    const deliveryOnGru = document.getElementById('deliveryGru');
    const deliveryOutsideGru = document.getElementById('deliveryOutsideGru');

    if (deliveryOutsideGru && deliveryOutsideGru.checked) {
        deliveryFee = 22; // Fee for outside GRU campus
    } else if (deliveryOnGru && deliveryOnGru.checked) {
        deliveryFee = 5; // Fee for on GRU campus
    }

    let subtotal = 0;
    document.querySelectorAll('.menu-card').forEach(card => {
        const priceText = card.querySelector('.item-name').innerText.match(/K(\d+(\.\d+)?)/);
        const price = priceText ? parseFloat(priceText[1]) : 0;
        const quantity = parseInt(card.querySelector('.quantity').innerText) || 0;
        subtotal += price * quantity;
    });

    let total = subtotal + serviceFee + deliveryFee;

    // Apply promo discount if available
    if (currentPromo) {
        if (currentPromo.type === 'percent') {
            const discount = (subtotal * currentPromo.amount) / 100;
            total -= discount;
        } else if (currentPromo.type === 'flat') {
            total -= currentPromo.amount;
        }
    }    return Math.max(0, total); // Ensure total is not negative
}

function proceedToCheckout() {
    const total = calculateTotal();
    if (total <= 2) {
        showToast('Please select at least one item before proceeding.', 'error');
        return;
    }
    showToast('Proceeding to checkout...', 'info');
    const items = [];

    document.querySelectorAll('.menu-card').forEach(card => {
        const quantity = parseInt(card.querySelector('.quantity-controls span').innerText) || 0;
        if (quantity > 0) {
            const priceText = card.querySelector('.menu-card-content span').innerText.match(/K(\d+(\.\d+)?)/);
            const price = priceText ? parseFloat(priceText[1]) : 0;
            items.push({
                name: card.querySelector('.menu-card-content span').innerText.split(' (')[0],
                quantity,
                price
            });
        }
    });

    const delivery = document.getElementById('deliveryGru')?.checked || document.getElementById('deliveryOutsideGru')?.checked;
    const deliveryFee = delivery && document.getElementById('deliveryOutsideGru')?.checked ? 22 : 5;

    const order = {
        items,
        delivery,
        deliveryFee,
        total
    };

    localStorage.setItem('order', JSON.stringify(order));
    window.location.href = '/checkout.html';
}

// Favorites functionality
async function toggleFavorite(itemId) {
    if (!currentUser) {
        showToast('Please login to add favorites', 'error');
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch('/api/users/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
        });
        
        const data = await response.json();
        if (data.success) {
            currentUser.favorites = data.favorites;
            await fetchAndDisplayMenu();
            showToast('Favorites updated', 'success');
        } else {
            showToast(data.message || 'Failed to update favorites', 'error');
        }
    } catch (error) {
        showToast('Failed to update favorites', 'error');
    }
}

// Promo code functionality
async function applyPromo() {
    const promoCode = document.getElementById('promoInput').value.trim();
    if (!promoCode) {
        showToast('Please enter a promo code', 'error');
        return;
    }
    
    try {
        showSpinner(true);
        const response = await fetch(`/api/promos/${promoCode}`);
        const data = await response.json();
        
        if (data.success) {
            currentPromo = data.promo;
            document.getElementById('promoStatus').innerHTML = 
                `<small class="text-success">✓ ${data.promo.description} applied!</small>`;
            updateSummary();
            showToast('Promo code applied!', 'success');
        } else {
            document.getElementById('promoStatus').innerHTML = 
                `<small class="text-danger">✗ ${data.message}</small>`;
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to apply promo code', 'error');
    } finally {
        showSpinner(false);
    }
}
