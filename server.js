require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { Parser } = require('json2csv');
const { body, validationResult } = require('express-validator');
const compression = require('compression');

const app = express();
// Performance middleware
app.use(compression());

// Security middleware
app.use(helmet());
// Logging middleware
app.use(morgan('combined'));
// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

const port = process.env.PORT || 3000; // Use the PORT environment variable

// Load initial data from JSON files
let menu, extras, orders;
let users, promos;

try {
    menu = JSON.parse(fs.readFileSync('menu.json'));
    extras = JSON.parse(fs.readFileSync('extras.json'));
    orders = JSON.parse(fs.readFileSync('orders.json'));
    users = JSON.parse(fs.readFileSync('users.json'));
    promos = JSON.parse(fs.readFileSync('promos.json'));
} catch (error) {
    console.error('Error loading initial data:', error);
    process.exit(1); // Exit if initial data can't be loaded
}

// Admin credentials from environment variables
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
const adminPasswordHash = bcrypt.hashSync(adminPassword, 10); // Hash the admin password

// Middleware
app.use(bodyParser.json());
// CORS with configurable origin
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', optionsSuccessStatus: 200 }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // only over HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Utility functions to save data to JSON files
function saveMenu() {
    fs.writeFileSync('menu.json', JSON.stringify(menu, null, 2));
}

function saveExtras() {
    fs.writeFileSync('extras.json', JSON.stringify(extras, null, 2));
}

function saveOrders() {
    fs.writeFileSync('orders.json', JSON.stringify(orders, null, 2));
}

function saveUsers() {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

function savePromos() {
    fs.writeFileSync('promos.json', JSON.stringify(promos, null, 2));
}

// Authentication middleware
function authenticate(req, res, next) {
    if (req.session.user && req.session.user === adminUsername) {
        return next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}

// Customer authentication middleware
function authenticateCustomer(req, res, next) {
    if (req.session.phone) {
        return next();
    } else {
        res.status(401).json({ success: false, message: 'Please login with your phone number' });
    }
}

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === adminUsername && bcrypt.compareSync(password, adminPasswordHash)) {
        req.session.user = adminUsername;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Admin logout endpoint
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Protect admin routes
app.use('/api/admin', authenticate);

// User authentication endpoints
app.post('/api/users/login', [
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('name').notEmpty().withMessage('Name is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, name } = req.body;
    let user = users.find(u => u.phone === phone);
    
    if (!user) {
        user = {
            phone,
            name,
            favorites: [],
            addresses: [],
            createdAt: new Date().toISOString()
        };
        users.push(user);
        saveUsers();
    } else {
        // Update name if provided
        user.name = name;
        saveUsers();
    }

    req.session.phone = phone;
    res.json({ success: true, user: { phone: user.phone, name: user.name, favorites: user.favorites } });
});

app.post('/api/users/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

app.get('/api/users/me', authenticateCustomer, (req, res) => {
    const user = users.find(u => u.phone === req.session.phone);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: { phone: user.phone, name: user.name, favorites: user.favorites, addresses: user.addresses } });
});

app.post('/api/users/favorites', authenticateCustomer, [
    body('itemId').notEmpty().withMessage('Item ID is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { itemId } = req.body;
    const user = users.find(u => u.phone === req.session.phone);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const favoriteIndex = user.favorites.indexOf(itemId);
    if (favoriteIndex > -1) {
        user.favorites.splice(favoriteIndex, 1);
    } else {
        user.favorites.push(itemId);
    }
    
    saveUsers();
    res.json({ success: true, favorites: user.favorites });
});

app.post('/api/users/addresses', authenticateCustomer, [
    body('address').notEmpty().withMessage('Address is required'),
    body('label').optional()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { address, label } = req.body;
    const user = users.find(u => u.phone === req.session.phone);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.addresses) user.addresses = [];
    
    const newAddress = {
        id: Date.now().toString(),
        address,
        label: label || 'Home',
        createdAt: new Date().toISOString()
    };
    
    user.addresses.push(newAddress);
    saveUsers();
    res.json({ success: true, addresses: user.addresses });
});

// Promo validation endpoint
app.get('/api/promos/:code', (req, res) => {
    const code = req.params.code;
    const promo = promos.find(p => p.code === code && p.active);
    if (!promo) {
        return res.status(404).json({ success: false, message: 'Invalid promo code' });
    }
    res.json({ success: true, promo });
});

// Menu endpoints
app.get('/api/menu', (req, res) => {
    res.json(menu);
});

app.post('/api/menu',
    [ body('name').notEmpty(), body('price').isFloat({ gt: 0 }) ],
    (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const newItem = req.body;
    newItem.id = Date.now().toString();
    menu.push(newItem);
    saveMenu();
    res.json({ success: true });
});

app.put('/api/menu/:id', (req, res) => {
    const itemId = req.params.id;
    const updatedItem = req.body;
    menu = menu.map(item => item.id === itemId ? updatedItem : item);
    saveMenu();
    res.json({ success: true });
});

app.delete('/api/menu/:id', (req, res) => {
    const itemId = req.params.id;
    menu = menu.filter(item => item.id !== itemId);
    saveMenu();
    res.json({ success: true });
});

// Extras endpoints
app.get('/api/extras', (req, res) => {
    res.json(extras);
});

app.post('/api/extras',
    [ body('name').notEmpty(), body('price').isFloat({ gt: 0 }) ],
    (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const newExtra = req.body;
    newExtra.id = Date.now().toString();
    extras.push(newExtra);
    saveExtras();
    res.json({ success: true });
});

app.put('/api/extras/:id', (req, res) => {
    const extraId = req.params.id;
    const updatedExtra = req.body;
    extras = extras.map(extra => extra.id === extraId ? updatedExtra : extra);
    saveExtras();
    res.json({ success: true });
});

app.delete('/api/extras/:id', (req, res) => {
    const extraId = req.params.id;
    extras = extras.filter(extra => extra.id !== extraId);
    saveExtras();
    res.json({ success: true });
});

// Orders endpoints
app.get('/api/orders', (req, res) => {
    console.log('GET request received for /api/orders');
    console.log('Orders:', JSON.stringify(orders, null, 2)); // Log the orders array for debugging
    res.json(orders);
});

app.post('/api/orders',
    [ body('name').notEmpty(), body('items').isArray({ min: 1 }), body('total').isFloat({ gt: 0 }), body('paymentMethod').notEmpty(), body('phone').isMobilePhone() ],
    (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const newOrder = req.body;

    // Validate transaction ID for certain payment methods
    if ((newOrder.paymentMethod === 'airtel' || newOrder.paymentMethod === 'mtn') && !newOrder.transactionId) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required for Airtel Money and MTN Money payments' });
    }

    // Generate order number as YYYYMMDDHHMMSS
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const orderNumber = `${year}${month}${day}${hours}${minutes}${seconds}`;

    newOrder.orderNumber = orderNumber;
    newOrder.timestamp = now.toISOString();
    orders.push(newOrder);
    saveOrders();
    console.log("POST /api/orders - Order placed:", JSON.stringify(newOrder, null, 2));
    res.json({ success: true, orderNumber: newOrder.orderNumber });
});

app.delete('/api/orders/:orderNumber', (req, res) => {
    const orderNumber = req.params.orderNumber;
    orders = orders.filter(order => order.orderNumber !== orderNumber);
    saveOrders();
    res.json({ success: true });
});

// Update order status endpoint
app.put('/api/orders/:orderNumber/status', (req, res) => {
    const orderNumber = req.params.orderNumber;
    const { status } = req.body;

    const orderToUpdate = orders.find(order => order.orderNumber === orderNumber);
    if (!orderToUpdate) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    orderToUpdate.status = status;
    saveOrders();

    res.json({ success: true, message: 'Order status updated successfully' });
});

// Get order status endpoint
app.get('/api/orders/status/:orderNumber', (req, res) => {
    const orderNumber = req.params.orderNumber;
    const order = orders.find(order => order.orderNumber === orderNumber);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, status: order.status });
});

// Order history for logged-in customer
app.get('/api/orders/history', authenticateCustomer, (req, res) => {
    const userOrders = orders.filter(o => o.phone === req.session.phone);
    res.json({ success: true, orders: userOrders });
});

// Export orders to CSV
app.get('/api/orders/export-csv', (req, res) => {
    const fields = ['orderNumber', 'name', 'total', 'delivery', 'transactionId', 'status'];
    const parser = new Parser({ fields });
    const csv = parser.parse(orders);
    res.header('Content-Type', 'text/csv');
    res.attachment('orders.csv');
    return res.send(csv);
});

// Generate sales report
app.get('/api/orders/sales-report', (req, res) => {
    const period = req.query.period;
    const now = new Date();
    let startDate;

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        return res.status(400).json({ success: false, message: 'Invalid period specified' });
    }

    const filteredOrders = orders.filter(order => new Date(order.timestamp) >= startDate);

    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = filteredOrders.filter(order => order.status === 'pending').length;
    const preparingOrders = filteredOrders.filter(order => order.status === 'preparing').length;
    const readyOrders = filteredOrders.filter(order => order.status === 'ready').length;
    const completedOrders = filteredOrders.filter(order => order.status === 'completed').length;

    const report = {
        totalSales,
        pendingOrders,
        preparingOrders,
        readyOrders,
        completedOrders
    };

    res.json(report);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve checkout page
app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unexpected error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
