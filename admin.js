// Admin Module

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin page
    if (document.getElementById('admin-container')) {
        // Check if user is admin
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            // Redirect non-admin users
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Load users
        loadUsers();
        
        // Set up add user button
        setupAddUserButton();
    }
});

// Load all users
function loadUsers() {
    const usersTable = document.getElementById('users-table-body');
    if (!usersTable) return;
    
    // Get all users
    const users = getUsers();
    
    // Apply any existing filters
    const searchInput = document.getElementById('search-users');
    const roleFilter = document.getElementById('role-filter');
    
    let filteredUsers = [...users];
    
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
            user.username.toLowerCase().includes(searchTerm)
        );
    }
    
    if (roleFilter && roleFilter.value !== 'all') {
        filteredUsers = filteredUsers.filter(user => 
            user.role === roleFilter.value
        );
    }
    
    // Clear table
    usersTable.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        // Show no users message
        usersTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No users found</td>
            </tr>
        `;
        return;
    }
    
    // Populate table with users
    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>
                <button class="btn btn-primary btn-sm edit-user-btn" data-id="${user.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">Delete</button>
            </td>
        `;
        
        usersTable.appendChild(row);
    });
    
    // Set up user action buttons
    setupUserActionButtons();
    
    // Set up search and filters
    setupUserFilters();
}

// Set up user filters
function setupUserFilters() {
    const searchInput = document.getElementById('search-users');
    const roleFilter = document.getElementById('role-filter');
    const resetFiltersBtn = document.getElementById('reset-user-filters');
    
    if (searchInput) {
        // Only add event listener if it's not already added
        if (!searchInput.dataset.listenerAdded) {
            searchInput.addEventListener('input', debounce(() => {
                loadUsers();
            }, 300));
            searchInput.dataset.listenerAdded = 'true';
        }
    }
    
    if (roleFilter) {
        // Only add event listener if it's not already added
        if (!roleFilter.dataset.listenerAdded) {
            roleFilter.addEventListener('change', () => {
                loadUsers();
            });
            roleFilter.dataset.listenerAdded = 'true';
        }
    }
    
    if (resetFiltersBtn) {
        // Only add event listener if it's not already added
        if (!resetFiltersBtn.dataset.listenerAdded) {
            resetFiltersBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (roleFilter) roleFilter.value = 'all';
                loadUsers();
            });
            resetFiltersBtn.dataset.listenerAdded = 'true';
        }
    }
}

// Set up add user button
function setupAddUserButton() {
    const addUserBtn = document.getElementById('add-user-btn');
    if (!addUserBtn) return;
    
    // Only add event listener if it's not already added
    if (!addUserBtn.dataset.listenerAdded) {
        addUserBtn.addEventListener('click', () => {
            // Create form content
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="add-user-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <div class="form-group">
                        <label for="confirm-password">Confirm Password</label>
                        <input type="password" id="confirm-password" name="confirm-password" required>
                    </div>
                    <div class="form-group">
                        <label for="role">Role</label>
                        <select id="role" name="role" required>
                            <option value="">Select a role</option>
                            <option value="player">Player</option>
                            <option value="coach">Coach</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Add New User', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Add User',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('add-user-form');
                        if (form.checkValidity()) {
                            const username = document.getElementById('username').value;
                            const password = document.getElementById('password').value;
                            const confirmPassword = document.getElementById('confirm-password').value;
                            const role = document.getElementById('role').value;
                            
                            // Validate passwords match
                            if (password !== confirmPassword) {
                                showFlashMessage('Passwords do not match', 'error');
                                return false; // Prevent modal from closing
                            }
                            
                            // Check if username already exists
                            const users = getUsers();
                            if (users.some(u => u.username === username)) {
                                showFlashMessage('Username already exists', 'error');
                                return false; // Prevent modal from closing
                            }
                            
                            // Create new user
                            const newUser = {
                                id: generateUserId(),
                                username,
                                password,
                                role
                            };
                            
                            // Add user to localStorage
                            users.push(newUser);
                            localStorage.setItem('users', JSON.stringify(users));
                            
                            // Show success message
                            showFlashMessage('User added successfully!', 'success');
                            
                            // Reload users table
                            loadUsers();
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
        
        addUserBtn.dataset.listenerAdded = 'true';
    }
}

// Set up user action buttons
function setupUserActionButtons() {
    // Edit buttons
    const editButtons = document.querySelectorAll('.edit-user-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            
            // Get user
            const users = getUsers();
            const user = users.find(u => u.id === userId);
            
            if (!user) {
                showFlashMessage('User not found', 'error');
                return;
            }
            
            // Create form content
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="edit-user-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" value="${user.username}" required>
                    </div>
                    <div class="form-group">
                        <label for="password">New Password (leave blank to keep current)</label>
                        <input type="password" id="password" name="password">
                    </div>
                    <div class="form-group">
                        <label for="confirm-password">Confirm New Password</label>
                        <input type="password" id="confirm-password" name="confirm-password">
                    </div>
                    <div class="form-group">
                        <label for="role">Role</label>
                        <select id="role" name="role" required>
                            <option value="player" ${user.role === 'player' ? 'selected' : ''}>Player</option>
                            <option value="coach" ${user.role === 'coach' ? 'selected' : ''}>Coach</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Edit User', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Save Changes',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('edit-user-form');
                        if (form.checkValidity()) {
                            const username = document.getElementById('username').value;
                            const password = document.getElementById('password').value;
                            const confirmPassword = document.getElementById('confirm-password').value;
                            const role = document.getElementById('role').value;
                            
                            // Check if username is changed and already exists
                            if (username !== user.username) {
                                const users = getUsers();
                                if (users.some(u => u.username === username)) {
                                    showFlashMessage('Username already exists', 'error');
                                    return false; // Prevent modal from closing
                                }
                            }
                            
                            // Validate passwords if changing
                            if (password) {
                                if (password !== confirmPassword) {
                                    showFlashMessage('Passwords do not match', 'error');
                                    return false; // Prevent modal from closing
                                }
                            }
                            
                            // Update user
                            user.username = username;
                            user.role = role;
                            
                            // Update password if provided
                            if (password) {
                                user.password = password;
                            }
                            
                            // Save to localStorage
                            const users = getUsers();
                            const index = users.findIndex(u => u.id === userId);
                            if (index !== -1) {
                                users[index] = user;
                                localStorage.setItem('users', JSON.stringify(users));
                                
                                // Show success message
                                showFlashMessage('User updated successfully!', 'success');
                                
                                // Reload users table
                                loadUsers();
                            }
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
    });
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-user-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            
            // Get user
            const users = getUsers();
            const user = users.find(u => u.id === userId);
            
            if (!user) {
                showFlashMessage('User not found', 'error');
                return;
            }
            
            // Check if trying to delete self
            const currentUser = getCurrentUser();
            if (currentUser.id === userId) {
                showFlashMessage('You cannot delete your own account', 'error');
                return;
            }
            
            // Confirm deletion
            const confirmContent = `
                <p>Are you sure you want to delete the user <strong>${user.username}</strong>?</p>
                <p>This action cannot be undone.</p>
            `;
            
            // Create confirmation modal
            const modal = createModal('Confirm Deletion', confirmContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Delete',
                    class: 'btn-danger',
                    callback: () => {
                        // Remove user from localStorage
                        const updatedUsers = users.filter(u => u.id !== userId);
                        localStorage.setItem('users', JSON.stringify(updatedUsers));
                        
                        // Show success message
                        showFlashMessage('User deleted successfully!', 'success');
                        
                        // Reload users table
                        loadUsers();
                    }
                }
            ]);
        });
    });
}

// Load all inventory locations
function loadLocations() {
    const locationsTable = document.getElementById('locations-table-body');
    if (!locationsTable) return;
    
    // Get inventory items to extract locations
    const inventory = getInventory();
    
    // Extract unique locations
    const locations = [...new Set(inventory.map(item => item.location))];
    
    // Clear table
    locationsTable.innerHTML = '';
    
    if (locations.length === 0) {
        // Show no locations message
        locationsTable.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">No locations found</td>
            </tr>
        `;
        return;
    }
    
    // Populate table with locations
    locations.forEach(location => {
        // Count items at this location
        const itemCount = inventory.filter(item => item.location === location).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${location}</td>
            <td>${itemCount}</td>
            <td>
                <button class="btn btn-primary btn-sm edit-location-btn" data-location="${location}">Edit</button>
                <button class="btn btn-danger btn-sm delete-location-btn" data-location="${location}">Delete</button>
            </td>
        `;
        
        locationsTable.appendChild(row);
    });
    
    // Set up location action buttons
    setupLocationActionButtons();
}

// Set up location action buttons
function setupLocationActionButtons() {
    // Edit buttons
    const editButtons = document.querySelectorAll('.edit-location-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const locationName = this.getAttribute('data-location');
            
            // Create form content
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="edit-location-form">
                    <div class="form-group">
                        <label for="location-name">Location Name</label>
                        <input type="text" id="location-name" name="location-name" value="${locationName}" required>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Edit Location', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Save Changes',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('edit-location-form');
                        if (form.checkValidity()) {
                            const newLocationName = document.getElementById('location-name').value;
                            
                            // Update location in all inventory items
                            const inventory = getInventory();
                            inventory.forEach(item => {
                                if (item.location === locationName) {
                                    item.location = newLocationName;
                                }
                            });
                            
                            // Save updated inventory
                            localStorage.setItem('inventory', JSON.stringify(inventory));
                            
                            // Show success message
                            showFlashMessage('Location updated successfully!', 'success');
                            
                            // Reload locations table
                            loadLocations();
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
    });
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-location-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const locationName = this.getAttribute('data-location');
            
            // Check if location has items
            const inventory = getInventory();
            const itemsAtLocation = inventory.filter(item => item.location === locationName);
            
            // Confirm deletion
            let confirmContent = `
                <p>Are you sure you want to delete the location <strong>${locationName}</strong>?</p>
            `;
            
            if (itemsAtLocation.length > 0) {
                confirmContent += `
                    <p class="text-danger">Warning: This location contains ${itemsAtLocation.length} item(s). 
                    You will need to reassign these items to another location.</p>
                    <div class="form-group">
                        <label for="new-location">Move items to:</label>
                        <select id="new-location" required>
                `;
                
                // Get other locations for reassignment
                const locations = [...new Set(inventory.map(item => item.location))];
                const otherLocations = locations.filter(loc => loc !== locationName);
                
                otherLocations.forEach(loc => {
                    confirmContent += `<option value="${loc}">${loc}</option>`;
                });
                
                confirmContent += `
                        </select>
                    </div>
                `;
            }
            
            // Create confirmation modal
            const modal = createModal('Confirm Deletion', confirmContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Delete',
                    class: 'btn-danger',
                    callback: () => {
                        if (itemsAtLocation.length > 0) {
                            const newLocation = document.getElementById('new-location').value;
                            
                            // Reassign items to new location
                            inventory.forEach(item => {
                                if (item.location === locationName) {
                                    item.location = newLocation;
                                }
                            });
                            
                            // Save updated inventory
                            localStorage.setItem('inventory', JSON.stringify(inventory));
                        }
                        
                        // Show success message
                        showFlashMessage('Location deleted successfully!', 'success');
                        
                        // Reload locations table
                        loadLocations();
                    }
                }
            ]);
        });
    });
}

// Load all categories
function loadCategories() {
    const categoriesTable = document.getElementById('categories-table-body');
    if (!categoriesTable) return;
    
    // Get inventory items to extract categories
    const inventory = getInventory();
    
    // Extract unique categories
    const categories = [...new Set(inventory.map(item => item.category))];
    
    // Clear table
    categoriesTable.innerHTML = '';
    
    if (categories.length === 0) {
        // Show no categories message
        categoriesTable.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">No categories found</td>
            </tr>
        `;
        return;
    }
    
    // Populate table with categories
    categories.forEach(category => {
        // Count items in this category
        const itemCount = inventory.filter(item => item.category === category).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category}</td>
            <td>${itemCount}</td>
            <td>
                <button class="btn btn-primary btn-sm edit-category-btn" data-category="${category}">Edit</button>
                <button class="btn btn-danger btn-sm delete-category-btn" data-category="${category}">Delete</button>
            </td>
        `;
        
        categoriesTable.appendChild(row);
    });
    
    // Set up category action buttons
    setupCategoryActionButtons();
}

// Set up category action buttons
function setupCategoryActionButtons() {
    // Edit buttons
    const editButtons = document.querySelectorAll('.edit-category-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryName = this.getAttribute('data-category');
            
            // Create form content
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="edit-category-form">
                    <div class="form-group">
                        <label for="category-name">Category Name</label>
                        <input type="text" id="category-name" name="category-name" value="${categoryName}" required>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Edit Category', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Save Changes',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('edit-category-form');
                        if (form.checkValidity()) {
                            const newCategoryName = document.getElementById('category-name').value;
                            
                            // Update category in all inventory items
                            const inventory = getInventory();
                            inventory.forEach(item => {
                                if (item.category === categoryName) {
                                    item.category = newCategoryName;
                                }
                            });
                            
                            // Save updated inventory
                            localStorage.setItem('inventory', JSON.stringify(inventory));
                            
                            // Show success message
                            showFlashMessage('Category updated successfully!', 'success');
                            
                            // Reload categories table
                            loadCategories();
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
    });
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-category-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoryName = this.getAttribute('data-category');
            
            // Check if category has items
            const inventory = getInventory();
            const itemsInCategory = inventory.filter(item => item.category === categoryName);
            
            // Confirm deletion
            let confirmContent = `
                <p>Are you sure you want to delete the category <strong>${categoryName}</strong>?</p>
            `;
            
            if (itemsInCategory.length > 0) {
                confirmContent += `
                    <p class="text-danger">Warning: This category contains ${itemsInCategory.length} item(s). 
                    You will need to reassign these items to another category.</p>
                    <div class="form-group">
                        <label for="new-category">Move items to:</label>
                        <select id="new-category" required>
                `;
                
                // Get other categories for reassignment
                const categories = [...new Set(inventory.map(item => item.category))];
                const otherCategories = categories.filter(cat => cat !== categoryName);
                
                otherCategories.forEach(cat => {
                    confirmContent += `<option value="${cat}">${cat}</option>`;
                });
                
                confirmContent += `
                        </select>
                    </div>
                `;
            }
            
            // Create confirmation modal
            const modal = createModal('Confirm Deletion', confirmContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Delete',
                    class: 'btn-danger',
                    callback: () => {
                        if (itemsInCategory.length > 0) {
                            const newCategory = document.getElementById('new-category').value;
                            
                            // Reassign items to new category
                            inventory.forEach(item => {
                                if (item.category === categoryName) {
                                    item.category = newCategory;
                                }
                            });
                            
                            // Save updated inventory
                            localStorage.setItem('inventory', JSON.stringify(inventory));
                        }
                        
                        // Show success message
                        showFlashMessage('Category deleted successfully!', 'success');
                        
                        // Reload categories table
                        loadCategories();
                    }
                }
            ]);
        });
    });
}

// Initialize admin tabs
function initializeAdminTabs() {
    const tabLinks = document.querySelectorAll('.admin-tab-link');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    
    // Show the first tab by default
    if (tabContents.length > 0) {
        tabContents[0].style.display = 'block';
    }
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get target tab
            const targetId = this.getAttribute('data-tab');
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Remove active class from all tab links
            tabLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            // Show target tab content
            document.getElementById(targetId).style.display = 'block';
            
            // Add active class to clicked tab link
            this.classList.add('active');
            
            // Load data based on active tab
            if (targetId === 'users-tab') {
                loadUsers();
            } else if (targetId === 'locations-tab') {
                loadLocations();
            } else if (targetId === 'categories-tab') {
                loadCategories();
            }
        });
    });
    
    // Initialize the first tab's data
    loadUsers();
}

// Call tab initialization when the admin page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.admin-tabs')) {
        initializeAdminTabs();
    }
});
