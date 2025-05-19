// Inventory Management Module

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the inventory page
    if (document.getElementById('inventory-container')) {
        // Load inventory items
        loadInventoryItems();
        
        // Set up search and filters
        setupSearchAndFilters();
        
        // Set up add item button for admins
        setupAddItemButton();
    }
    
    // Check if we're on the item detail page
    if (document.getElementById('item-detail-container')) {
        // Get item ID from URL
        const itemId = getUrlParameter('id');
        if (itemId) {
            // Load item details
            loadItemDetails(itemId);
        } else {
            // Redirect to inventory page if no ID provided
            window.location.href = 'inventory.html';
        }
    }
});

// Load inventory items
function loadInventoryItems() {
    const inventoryTable = document.getElementById('inventory-table-body');
    if (!inventoryTable) return;
    
    // Get inventory items
    let items = getInventory();
    
    // Calculate available quantities based on borrow records
    items.forEach(item => {
        updateInventoryQuantity(item.id);
    });
    
    // Refresh items after updating quantities
    items = getInventory();
    
    // Apply any existing filters
    const searchInput = document.getElementById('search-inventory');
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        items = items.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm)
        );
    }
    
    if (categoryFilter && categoryFilter.value) {
        const category = categoryFilter.value;
        if (category !== 'all') {
            items = items.filter(item => item.category === category);
        }
    }
    
    if (statusFilter && statusFilter.value) {
        const status = statusFilter.value;
        if (status === 'available') {
            items = items.filter(item => item.availableQuantity > item.threshold);
        } else if (status === 'low') {
            items = items.filter(item => item.availableQuantity > 0 && item.availableQuantity <= item.threshold);
        } else if (status === 'unavailable') {
            items = items.filter(item => item.availableQuantity === 0);
        }
    }
    
    // Clear table
    inventoryTable.innerHTML = '';
    
    if (items.length === 0) {
        // Show no items message
        inventoryTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No items found</td>
            </tr>
        `;
        return;
    }
    
    // Populate table with items
    items.forEach(item => {
        // Determine status class and text
        const statusClass = getStatusClass(item.availableQuantity, item.threshold);
        const statusText = getStatusText(item.availableQuantity, item.threshold);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.availableQuantity !== undefined ? item.availableQuantity : item.quantity} / ${item.quantity}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${item.location}</td>
            <td>${formatDate(item.lastUpdated)}</td>
            <td>
                <a href="inventory-detail.html?id=${item.id}" class="btn btn-primary btn-sm">View</a>
                <button class="btn btn-secondary btn-sm borrow-btn" data-id="${item.id}">Borrow</button>
                <button class="btn btn-danger btn-sm delete-btn admin-only" data-id="${item.id}">Delete</button>
            </td>
        `;
        
        inventoryTable.appendChild(row);
    });
    
    // Set up role-based elements
    setupRoleBasedAccess();
    
    // Add event listeners to action buttons
    setupActionButtons();
    
    // Populate category filter options
    populateCategoryFilter();
}

// Set up search and filters
function setupSearchAndFilters() {
    const searchInput = document.getElementById('search-inventory');
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadInventoryItems();
        }, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            loadInventoryItems();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loadInventoryItems();
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = 'all';
            if (statusFilter) statusFilter.value = 'all';
            loadInventoryItems();
        });
    }
}

// Populate category filter with unique categories
function populateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    // Get all inventory items
    const items = getInventory();
    
    // Extract unique categories
    const categories = [...new Set(items.map(item => item.category))];
    
    // Store current selection
    const currentSelection = categoryFilter.value;
    
    // Clear existing options except 'All Categories'
    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }
    
    // Add options for each category
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Restore previous selection if it exists
    if (categories.includes(currentSelection)) {
        categoryFilter.value = currentSelection;
    }
}

// Set up add item button for admins
function setupAddItemButton() {
    const addItemBtn = document.getElementById('add-item-btn');
    if (!addItemBtn) return;
    
    addItemBtn.addEventListener('click', () => {
        // Create form content
        const formContent = document.createElement('div');
        formContent.innerHTML = `
            <form id="add-item-form">
                <div class="form-group">
                    <label for="item-name">Item Name</label>
                    <input type="text" id="item-name" name="item-name" required>
                </div>
                <div class="form-group">
                    <label for="item-category">Category</label>
                    <input type="text" id="item-category" name="item-category" required>
                </div>
                <div class="form-group">
                    <label for="item-quantity">Quantity</label>
                    <input type="number" id="item-quantity" name="item-quantity" min="0" required>
                </div>
                <div class="form-group">
                    <label for="item-location">Location</label>
                    <input type="text" id="item-location" name="item-location" required>
                </div>
                <div class="form-group">
                    <label for="item-threshold">Low Stock Threshold</label>
                    <input type="number" id="item-threshold" name="item-threshold" min="0" required>
                </div>
                <div class="form-group">
                    <label for="item-condition">Condition</label>
                    <select id="item-condition" name="item-condition" required>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="item-notes">Notes</label>
                    <textarea id="item-notes" name="item-notes" rows="3"></textarea>
                </div>
            </form>
        `;
        
        // Create modal with form
        const modal = createModal('Add New Item', formContent, [
            {
                text: 'Cancel',
                class: 'btn-secondary'
            },
            {
                text: 'Add Item',
                class: 'btn-primary',
                callback: () => {
                    const form = document.getElementById('add-item-form');
                    if (form.checkValidity()) {
                        // Get form values
                        const newItem = {
                            id: generateItemId(),
                            name: document.getElementById('item-name').value,
                            category: document.getElementById('item-category').value,
                            quantity: parseInt(document.getElementById('item-quantity').value),
                            availableQuantity: parseInt(document.getElementById('item-quantity').value),
                            location: document.getElementById('item-location').value,
                            threshold: parseInt(document.getElementById('item-threshold').value),
                            condition: document.getElementById('item-condition').value,
                            notes: document.getElementById('item-notes').value,
                            lastUpdated: new Date().toISOString()
                        };
                        
                        // Save new item
                        saveInventoryItem(newItem);
                        
                        // Show success message
                        showFlashMessage('Item added successfully!', 'success');
                        
                        // Reload inventory table
                        loadInventoryItems();
                    } else {
                        form.reportValidity();
                        return false; // Prevent modal from closing
                    }
                }
            }
        ]);
    });
}

// Set up action buttons for inventory items
function setupActionButtons() {
    // Borrow buttons
    const borrowButtons = document.querySelectorAll('.borrow-btn');
    borrowButtons.forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            const item = getInventoryItem(itemId);
            
            if (!item) {
                showFlashMessage('Item not found', 'error');
                return;
            }
            
            // Check if item is available
            if (item.availableQuantity <= 0) {
                showFlashMessage('This item is currently unavailable', 'error');
                return;
            }
            
            // Create borrow form
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="borrow-form">
                    <div class="form-group">
                        <label for="borrow-item">Item</label>
                        <input type="text" id="borrow-item" value="${item.name}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="borrow-quantity">Quantity</label>
                        <input type="number" id="borrow-quantity" name="borrow-quantity" min="1" max="${item.availableQuantity}" value="1" required>
                        <small>Available: ${item.availableQuantity}</small>
                    </div>
                    <div class="form-group">
                        <label for="borrow-duration">Duration (days)</label>
                        <input type="number" id="borrow-duration" name="borrow-duration" min="1" max="30" value="7" required>
                    </div>
                    <div class="form-group">
                        <label for="borrow-purpose">Purpose</label>
                        <textarea id="borrow-purpose" name="borrow-purpose" rows="3" required></textarea>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Borrow Item', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Submit Request',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('borrow-form');
                        if (form.checkValidity()) {
                            const currentUser = getCurrentUser();
                            
                            if (!currentUser) {
                                showFlashMessage('You must be logged in to borrow items', 'error');
                                return;
                            }
                            
                            const quantity = parseInt(document.getElementById('borrow-quantity').value);
                            const duration = parseInt(document.getElementById('borrow-duration').value);
                            const purpose = document.getElementById('borrow-purpose').value;
                            
                            // Calculate due date
                            const today = new Date();
                            const dueDate = new Date(today);
                            dueDate.setDate(today.getDate() + duration);
                            
                            // Create borrow record
                            const borrowRecord = {
                                itemId: item.id,
                                userId: currentUser.id,
                                quantity: quantity,
                                requestDate: today.toISOString(),
                                dueDate: dueDate.toISOString(),
                                purpose: purpose,
                                status: currentUser.role === 'admin' ? 'approved' : 'pending'
                            };
                            
                            // Save borrow record
                            saveBorrowRecord(borrowRecord);
                            
                            // Create notification for coaches/admins if not admin
                            if (currentUser.role !== 'admin') {
                                const notification = {
                                    type: 'borrow_request',
                                    title: 'New Borrow Request',
                                    message: `${currentUser.username} has requested to borrow ${quantity} ${item.name}(s)`,
                                    itemId: item.id,
                                    userId: currentUser.id,
                                    recordId: borrowRecord.id,
                                    severity: 'info'
                                };
                                
                                addNotification(notification);
                            }
                            
                            // Show success message
                            if (currentUser.role === 'admin') {
                                showFlashMessage('Item borrowed successfully!', 'success');
                            } else {
                                showFlashMessage('Borrow request submitted successfully!', 'success');
                            }
                            
                            // Reload inventory table
                            loadInventoryItems();
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
            
            // Add validation for quantity field
            const quantityField = document.getElementById('borrow-quantity');
            quantityField.addEventListener('input', function() {
                if (parseInt(this.value) > item.availableQuantity) {
                    this.setCustomValidity(`Maximum available quantity is ${item.availableQuantity}`);
                } else {
                    this.setCustomValidity('');
                }
            });
        });
    });
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            const item = getInventoryItem(itemId);
            
            if (!item) {
                showFlashMessage('Item not found', 'error');
                return;
            }
            
            // Show confirmation dialog
            const confirmContent = `
                <p>Are you sure you want to delete <strong>${item.name}</strong>?</p>
                <p>This action cannot be undone and will also delete any associated borrow records.</p>
            `;
            
            const modal = createModal('Confirm Deletion', confirmContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Delete',
                    class: 'btn-danger',
                    callback: () => {
                        // Delete item
                        deleteInventoryItem(itemId);
                        
                        // Show success message
                        showFlashMessage('Item deleted successfully!', 'success');
                        
                        // Reload inventory table
                        loadInventoryItems();
                    }
                }
            ]);
        });
    });
}

// Load item details
function loadItemDetails(itemId) {
    const item = getInventoryItem(itemId);
    const container = document.getElementById('item-detail-container');
    
    if (!item || !container) {
        showFlashMessage('Item not found', 'error');
        window.location.href = 'inventory.html';
        return;
    }
    
    // Get borrow records for this item
    const borrowRecords = getItemBorrowRecords(itemId);
    
    // Update available quantity
    updateInventoryQuantity(itemId);
    
    // Refresh item after updating quantity
    const updatedItem = getInventoryItem(itemId);
    
    // Determine status class and text
    const statusClass = getStatusClass(updatedItem.availableQuantity, updatedItem.threshold);
    const statusText = getStatusText(updatedItem.availableQuantity, updatedItem.threshold);
    
    // Build item details HTML
    container.innerHTML = `
        <div class="item-header">
            <h2>${updatedItem.name}</h2>
            <div class="item-actions">
                <button id="edit-item-btn" class="btn btn-primary admin-only">Edit Item</button>
                <button id="borrow-item-btn" class="btn btn-secondary">Borrow</button>
                <button id="back-to-inventory" class="btn btn-secondary">Back to Inventory</button>
            </div>
        </div>
        
        <div class="item-info">
            <div>
                <div class="item-info-group">
                    <div class="item-info-label">Category</div>
                    <div>${updatedItem.category}</div>
                </div>
                <div class="item-info-group">
                    <div class="item-info-label">Quantity</div>
                    <div>${updatedItem.availableQuantity} / ${updatedItem.quantity}</div>
                </div>
                <div class="item-info-group">
                    <div class="item-info-label">Status</div>
                    <div class="${statusClass}">${statusText}</div>
                </div>
            </div>
            <div>
                <div class="item-info-group">
                    <div class="item-info-label">Location</div>
                    <div>${updatedItem.location}</div>
                </div>
                <div class="item-info-group">
                    <div class="item-info-label">Condition</div>
                    <div>${updatedItem.condition}</div>
                </div>
                <div class="item-info-group">
                    <div class="item-info-label">Last Updated</div>
                    <div>${formatDateTime(updatedItem.lastUpdated)}</div>
                </div>
            </div>
        </div>
        
        <div class="item-notes mt-3">
            <div class="item-info-label">Notes</div>
            <div>${updatedItem.notes || 'No notes available'}</div>
        </div>
        
        <div class="item-history mt-4">
            <h3>Borrow History</h3>
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Quantity</th>
                        <th>Request Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="borrow-history-table">
                    ${borrowRecords.length === 0 ? '<tr><td colspan="6" class="text-center">No borrow history found</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
    
    // Populate borrow history table
    if (borrowRecords.length > 0) {
        const historyTable = document.getElementById('borrow-history-table');
        
        // Sort records by request date (newest first)
        borrowRecords.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
        
        borrowRecords.forEach(record => {
            const user = getUserById(record.userId);
            
            // Determine if item is overdue
            const isOverdue = record.status === 'approved' && 
                             new Date() > new Date(record.dueDate) && 
                             record.status !== 'returned';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user ? user.username : 'Unknown User'}</td>
                <td>${record.quantity}</td>
                <td>${formatDate(record.requestDate)}</td>
                <td class="${isOverdue ? 'status-unavailable' : ''}">${formatDate(record.dueDate)}</td>
                <td>${record.status === 'approved' ? 'Borrowed' : 
                      record.status === 'returned' ? 'Returned' : 
                      record.status === 'rejected' ? 'Rejected' : 'Pending'}</td>
                <td>
                    ${record.status === 'pending' ? 
                      `<button class="btn btn-success btn-sm approve-btn admin-only" data-id="${record.id}">Approve</button>
                       <button class="btn btn-danger btn-sm reject-btn admin-only" data-id="${record.id}">Reject</button>` : 
                      record.status === 'approved' ? 
                      `<button class="btn btn-primary btn-sm return-btn" data-id="${record.id}">Return</button>` : ''}
                </td>
            `;
            
            historyTable.appendChild(row);
        });
    }
    
    // Set up event listeners
    
    // Back button
    document.getElementById('back-to-inventory').addEventListener('click', () => {
        window.location.href = 'inventory.html';
    });
    
    // Edit button (admin only)
    const editButton = document.getElementById('edit-item-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            // Create form content
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="edit-item-form">
                    <div class="form-group">
                        <label for="item-name">Item Name</label>
                        <input type="text" id="item-name" name="item-name" value="${updatedItem.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="item-category">Category</label>
                        <input type="text" id="item-category" name="item-category" value="${updatedItem.category}" required>
                    </div>
                    <div class="form-group">
                        <label for="item-quantity">Total Quantity</label>
                        <input type="number" id="item-quantity" name="item-quantity" min="0" value="${updatedItem.quantity}" required>
                    </div>
                    <div class="form-group">
                        <label for="item-location">Location</label>
                        <input type="text" id="item-location" name="item-location" value="${updatedItem.location}" required>
                    </div>
                    <div class="form-group">
                        <label for="item-threshold">Low Stock Threshold</label>
                        <input type="number" id="item-threshold" name="item-threshold" min="0" value="${updatedItem.threshold}" required>
                    </div>
                    <div class="form-group">
                        <label for="item-condition">Condition</label>
                        <select id="item-condition" name="item-condition" required>
                            <option value="Excellent" ${updatedItem.condition === 'Excellent' ? 'selected' : ''}>Excellent</option>
                            <option value="Good" ${updatedItem.condition === 'Good' ? 'selected' : ''}>Good</option>
                            <option value="Fair" ${updatedItem.condition === 'Fair' ? 'selected' : ''}>Fair</option>
                            <option value="Poor" ${updatedItem.condition === 'Poor' ? 'selected' : ''}>Poor</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="item-notes">Notes</label>
                        <textarea id="item-notes" name="item-notes" rows="3">${updatedItem.notes || ''}</textarea>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Edit Item', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Save Changes',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('edit-item-form');
                        if (form.checkValidity()) {
                            // Get form values
                            const updatedItemData = {
                                id: updatedItem.id,
                                name: document.getElementById('item-name').value,
                                category: document.getElementById('item-category').value,
                                quantity: parseInt(document.getElementById('item-quantity').value),
                                location: document.getElementById('item-location').value,
                                threshold: parseInt(document.getElementById('item-threshold').value),
                                condition: document.getElementById('item-condition').value,
                                notes: document.getElementById('item-notes').value,
                                lastUpdated: new Date().toISOString()
                            };
                            
                            // Save updated item
                            saveInventoryItem(updatedItemData);
                            
                            // Show success message
                            showFlashMessage('Item updated successfully!', 'success');
                            
                            // Reload item details
                            loadItemDetails(itemId);
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
    }
    
    // Borrow button
    document.getElementById('borrow-item-btn').addEventListener('click', () => {
        // Check if item is available
        if (updatedItem.availableQuantity <= 0) {
            showFlashMessage('This item is currently unavailable', 'error');
            return;
        }
        
        // Create borrow form
        const formContent = document.createElement('div');
        formContent.innerHTML = `
            <form id="borrow-form">
                <div class="form-group">
                    <label for="borrow-item">Item</label>
                    <input type="text" id="borrow-item" value="${updatedItem.name}" disabled>
                </div>
                <div class="form-group">
                    <label for="borrow-quantity">Quantity</label>
                    <input type="number" id="borrow-quantity" name="borrow-quantity" min="1" max="${updatedItem.availableQuantity}" value="1" required>
                    <small>Available: ${updatedItem.availableQuantity}</small>
                </div>
                <div class="form-group">
                    <label for="borrow-duration">Duration (days)</label>
                    <input type="number" id="borrow-duration" name="borrow-duration" min="1" max="30" value="7" required>
                </div>
                <div class="form-group">
                    <label for="borrow-purpose">Purpose</label>
                    <textarea id="borrow-purpose" name="borrow-purpose" rows="3" required></textarea>
                </div>
            </form>
        `;
        
        // Create modal with form
        const modal = createModal('Borrow Item', formContent, [
            {
                text: 'Cancel',
                class: 'btn-secondary'
            },
            {
                text: 'Submit Request',
                class: 'btn-primary',
                callback: () => {
                    const form = document.getElementById('borrow-form');
                    if (form.checkValidity()) {
                        const currentUser = getCurrentUser();
                        
                        if (!currentUser) {
                            showFlashMessage('You must be logged in to borrow items', 'error');
                            return;
                        }
                        
                        const quantity = parseInt(document.getElementById('borrow-quantity').value);
                        const duration = parseInt(document.getElementById('borrow-duration').value);
                        const purpose = document.getElementById('borrow-purpose').value;
                        
                        // Calculate due date
                        const today = new Date();
                        const dueDate = new Date(today);
                        dueDate.setDate(today.getDate() + duration);
                        
                        // Create borrow record
                        const borrowRecord = {
                            itemId: updatedItem.id,
                            userId: currentUser.id,
                            quantity: quantity,
                            requestDate: today.toISOString(),
                            dueDate: dueDate.toISOString(),
                            purpose: purpose,
                            status: currentUser.role === 'admin' ? 'approved' : 'pending'
                        };
                        
                        // Save borrow record
                        saveBorrowRecord(borrowRecord);
                        
                        // Create notification for coaches/admins if not admin
                        if (currentUser.role !== 'admin') {
                            const notification = {
                                type: 'borrow_request',
                                title: 'New Borrow Request',
                                message: `${currentUser.username} has requested to borrow ${quantity} ${updatedItem.name}(s)`,
                                itemId: updatedItem.id,
                                userId: currentUser.id,
                                recordId: borrowRecord.id,
                                severity: 'info'
                            };
                            
                            addNotification(notification);
                        }
                        
                        // Show success message
                        if (currentUser.role === 'admin') {
                            showFlashMessage('Item borrowed successfully!', 'success');
                        } else {
                            showFlashMessage('Borrow request submitted successfully!', 'success');
                        }
                        
                        // Reload item details
                        loadItemDetails(itemId);
                    } else {
                        form.reportValidity();
                        return false; // Prevent modal from closing
                    }
                }
            }
        ]);
        
        // Add validation for quantity field
        const quantityField = document.getElementById('borrow-quantity');
        quantityField.addEventListener('input', function() {
            if (parseInt(this.value) > updatedItem.availableQuantity) {
                this.setCustomValidity(`Maximum available quantity is ${updatedItem.availableQuantity}`);
            } else {
                this.setCustomValidity('');
            }
        });
    });
    
    // Approve, reject and return buttons
    setupBorrowHistoryButtons();
    
    // Set up role-based elements
    setupRoleBasedAccess();
}

// Set up borrow history action buttons
function setupBorrowHistoryButtons() {
    // Approve buttons
    const approveButtons = document.querySelectorAll('.approve-btn');
    approveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.getAttribute('data-id');
            const record = getBorrowRecord(recordId);
            
            if (!record) {
                showFlashMessage('Record not found', 'error');
                return;
            }
            
            // Update record status
            record.status = 'approved';
            saveBorrowRecord(record);
            
            // Get item and user
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            // Create notification for user
            if (user) {
                const notification = {
                    type: 'request_approved',
                    title: 'Request Approved',
                    message: `Your request to borrow ${record.quantity} ${item.name}(s) has been approved.`,
                    itemId: record.itemId,
                    userId: record.userId,
                    recordId: record.id,
                    severity: 'success'
                };
                
                addNotification(notification);
            }
            
            // Show success message
            showFlashMessage('Request approved successfully!', 'success');
            
            // Reload item details
            const itemId = getUrlParameter('id');
            if (itemId) {
                loadItemDetails(itemId);
            }
        });
    });
    
    // Reject buttons
    const rejectButtons = document.querySelectorAll('.reject-btn');
    rejectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.getAttribute('data-id');
            const record = getBorrowRecord(recordId);
            
            if (!record) {
                showFlashMessage('Record not found', 'error');
                return;
            }
            
            // Update record status
            record.status = 'rejected';
            saveBorrowRecord(record);
            
            // Get item and user
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            // Create notification for user
            if (user) {
                const notification = {
                    type: 'request_rejected',
                    title: 'Request Rejected',
                    message: `Your request to borrow ${record.quantity} ${item.name}(s) has been rejected.`,
                    itemId: record.itemId,
                    userId: record.userId,
                    recordId: record.id,
                    severity: 'danger'
                };
                
                addNotification(notification);
            }
            
            // Show success message
            showFlashMessage('Request rejected successfully!', 'success');
            
            // Reload item details
            const itemId = getUrlParameter('id');
            if (itemId) {
                loadItemDetails(itemId);
            }
        });
    });
    
    // Return buttons
    const returnButtons = document.querySelectorAll('.return-btn');
    returnButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.getAttribute('data-id');
            const record = getBorrowRecord(recordId);
            
            if (!record) {
                showFlashMessage('Record not found', 'error');
                return;
            }
            
            // Update record status
            record.status = 'returned';
            record.returnDate = new Date().toISOString();
            saveBorrowRecord(record);
            
            // Get item and admin users
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            // Create notification for admins
            const notification = {
                type: 'item_returned',
                title: 'Item Returned',
                message: `${user ? user.username : 'A user'} has returned ${record.quantity} ${item.name}(s).`,
                itemId: record.itemId,
                userId: record.userId,
                recordId: record.id,
                severity: 'success'
            };
            
            addNotification(notification);
            
            // Show success message
            showFlashMessage('Item returned successfully!', 'success');
            
            // Reload item details
            const itemId = getUrlParameter('id');
            if (itemId) {
                loadItemDetails(itemId);
            }
        });
    });
}
