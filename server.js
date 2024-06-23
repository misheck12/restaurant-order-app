const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = 3000;

// Load initial data from JSON files
let menu, extras, orders;

try {
    menu = JSON.parse(fs.readFileSync('menu.json'));
    extras = JSON.parse(fs.readFileSync('extras.json'));
    orders = JSON.parse(fs.readFileSync('orders.json'));
} catch (error) {
    console.error('Error loading initial data:', error);
    process.exit(1); // Exit if initial data can't be loaded
}

// Admin credentials
const adminUsername = 'admin';
const adminPasswordHash = bcrypt.hashSync('password123', 10); // Hash the admin password

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public')); 
app.use(session({
    secret: 'your_secret_key', // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use true if you serve over HTTPS
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

// Authentication middleware
function authenticate(req, res, next) {
    if (req.session.user && req.session.user === adminUsername) {
        return next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
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

// Menu endpoints
app.get('/api/menu', (req, res) => {
    res.json(menu);
});

app.post('/api/menu', (req, res) => {
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

app.post('/api/extras', (req, res) => {
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

app.post('/api/orders', (req, res) => {
    const newOrder = req.body;

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

// Serve checkout page
app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
