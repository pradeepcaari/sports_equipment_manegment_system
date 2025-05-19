// Authentication Module
document.addEventListener('DOMContentLoaded', function() {
    // Show register form
    const showRegisterFormLink = document.createElement('p');
    showRegisterFormLink.innerHTML = 'New user? <a href="#" id="showRegister">Register here</a>';
    showRegisterFormLink.classList.add('text-center', 'mt-3');
    document.querySelector('.login-form').appendChild(showRegisterFormLink);

    // Initialize event listeners
    if (document.getElementById('showRegister')) {
        document.getElementById('showRegister').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('register-container').style.display = 'block';
        });
    }

    if (document.getElementById('backToLogin')) {
        document.getElementById('backToLogin').addEventListener('click', function() {
            document.getElementById('register-container').style.display = 'none';
            document.getElementById('login-container').style.display = 'block';
        });
    }

    // Handle login form submission
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('login-error');
            
            // Validate inputs
            if (!username || !password) {
                errorElement.textContent = 'Please enter both username and password';
                return;
            }

            // Try to login
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.username === username && u.password === password);
            
            if (user) {
                // Set current user in session
                sessionStorage.setItem('currentUser', JSON.stringify({
                    id: user.id,
                    username: user.username,
                    role: user.role
                }));

                // Show success message
                showFlashMessage('Login successful! Redirecting...', 'success');
                
                // Redirect to appropriate dashboard based on role
                setTimeout(() => {
                    window.location.href = 'pages/dashboard.html';
                }, 1000);
            } else {
                errorElement.textContent = 'Invalid username or password';
            }
        });
    }

    // Handle registration form submission
    if (document.getElementById('registerForm')) {
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const role = document.getElementById('user-role').value;
            const errorElement = document.getElementById('register-error');
            
            // Validate inputs
            if (!username || !password || !confirmPassword || !role) {
                errorElement.textContent = 'Please fill in all fields';
                return;
            }
            
            if (password !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match';
                return;
            }
            
            // Check if username already exists
            const users = JSON.parse(localStorage.getItem('users')) || [];
            if (users.some(u => u.username === username)) {
                errorElement.textContent = 'Username already exists';
                return;
            }
            
            // Create new user
            const newUser = {
                id: generateUserId(),
                username,
                password, // In a real application, this should be hashed
                role
            };
            
            // Add user to local storage
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Initialize default admin if this is the first admin user
            if (role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
                initializeDatabase();
            }
            
            // Show success message
            showFlashMessage('Registration successful! You can now login.', 'success');
            
            // Reset form and go back to login
            document.getElementById('registerForm').reset();
            document.getElementById('register-container').style.display = 'none';
            document.getElementById('login-container').style.display = 'block';
        });
    }

    // Check if user is logged in on protected pages
    if (!window.location.href.includes('index.html') && !isLoggedIn()) {
        window.location.href = '../index.html';
    }
});

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
    return JSON.parse(sessionStorage.getItem('currentUser'));
}

// Logout user
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
}

// Generate unique user ID
function generateUserId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Flash message utility
function showFlashMessage(message, type = 'info') {
    // Create flash message element if it doesn't exist
    let flashElement = document.querySelector('.flash-message');
    if (!flashElement) {
        flashElement = document.createElement('div');
        flashElement.className = 'flash-message';
        document.body.appendChild(flashElement);
    }
    
    // Set message and type
    flashElement.textContent = message;
    flashElement.className = `flash-message flash-${type}`;
    
    // Show the message
    setTimeout(() => {
        flashElement.classList.add('show');
    }, 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        flashElement.classList.remove('show');
    }, 3000);
}

// Initialize default data if needed
function initializeDatabase() {
    // Check if database is already initialized
    if (localStorage.getItem('databaseInitialized')) {
        return;
    }
    
    // Set default inventory items
    const defaultItems = [
        {
            id: 'item1',
            name: 'Basketball',
            category: 'Ball',
            quantity: 15,
            location: 'Main Storage Room',
            threshold: 5,
            condition: 'Good',
            notes: 'Official size and weight',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item2',
            name: 'Football',
            category: 'Ball',
            quantity: 10,
            location: 'Main Storage Room',
            threshold: 4,
            condition: 'Good',
            notes: 'Standard size',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item3',
            name: 'Tennis Racket',
            category: 'Equipment',
            quantity: 8,
            location: 'Tennis Court Storage',
            threshold: 3,
            condition: 'Good',
            notes: 'Adult size',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item4',
            name: 'Volleyball',
            category: 'Ball',
            quantity: 6,
            location: 'Main Storage Room',
            threshold: 3,
            condition: 'Good',
            notes: 'Competition quality',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item5',
            name: 'Cricket Bat',
            category: 'Equipment',
            quantity: 5,
            location: 'Cricket Field Storage',
            threshold: 2,
            condition: 'Fair',
            notes: 'Standard size',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item6',
            name: 'Badminton Racket',
            category: 'Equipment',
            quantity: 12,
            location: 'Gymnasium Storage',
            threshold: 4,
            condition: 'Good',
            notes: 'Set of 12 rackets',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item7',
            name: 'Table Tennis Paddle',
            category: 'Equipment',
            quantity: 8,
            location: 'Recreation Room',
            threshold: 3,
            condition: 'Good',
            notes: 'Professional grade',
            lastUpdated: new Date().toISOString()
        },
        {
            id: 'item8',
            name: 'Yoga Mat',
            category: 'Exercise',
            quantity: 20,
            location: 'Fitness Center',
            threshold: 5,
            condition: 'Excellent',
            notes: 'Standard size yoga mats',
            lastUpdated: new Date().toISOString()
        }
    ];
    
    localStorage.setItem('inventory', JSON.stringify(defaultItems));
    
    // Set empty borrow records
    localStorage.setItem('borrowRecords', JSON.stringify([]));
    
    // Set empty notifications
    localStorage.setItem('notifications', JSON.stringify([]));
    
    // Mark database as initialized
    localStorage.setItem('databaseInitialized', 'true');
}
