// Borrowing Module

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the borrow page
    if (document.getElementById('borrow-requests-container')) {
        // Load all borrow requests
        loadBorrowRequests();
        
        // Set up search and filters
        setupBorrowFilters();
    }
    
    // Check if we're on the returns page
    if (document.getElementById('returns-container')) {
        // Load all borrowed items for return
        loadBorrowedItems();
        
        // Set up search and filters
        setupReturnsFilters();
    }
});

// Load all borrow requests
function loadBorrowRequests() {
    const requestsTable = document.getElementById('borrow-requests-table');
    if (!requestsTable) return;
    
    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    // Get all borrow records
    let borrowRecords = getBorrowRecords();
    
    // Filter records based on user role
    if (currentUser.role === 'admin' || currentUser.role === 'coach') {
        // Admins and coaches can see all pending requests
        borrowRecords = borrowRecords.filter(record => record.status === 'pending');
    } else {
        // Regular users can only see their own requests
        borrowRecords = borrowRecords.filter(record => 
            record.userId === currentUser.id && 
            record.status === 'pending'
        );
    }
    
    // Apply any existing filters
    const searchInput = document.getElementById('search-requests');
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        borrowRecords = borrowRecords.filter(record => {
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            return item.name.toLowerCase().includes(searchTerm) ||
                  (user && user.username.toLowerCase().includes(searchTerm));
        });
    }
    
    // Sort by request date (newest first)
    borrowRecords.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    // Clear table
    requestsTable.innerHTML = '';
    
    if (borrowRecords.length === 0) {
        // Show no requests message
        requestsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No pending requests found</td>
            </tr>
        `;
        return;
    }
    
    // Populate table with requests
    borrowRecords.forEach(record => {
        const item = getInventoryItem(record.itemId);
        const user = getUserById(record.userId);
        
        if (!item || !user) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${item.name}</td>
            <td>${record.quantity}</td>
            <td>${formatDate(record.requestDate)}</td>
            <td>${formatDate(record.dueDate)}</td>
            <td>${record.purpose}</td>
            <td>
                ${(currentUser.role === 'admin' || currentUser.role === 'coach') ? 
                  `<button class="btn btn-success btn-sm approve-btn" data-id="${record.id}">Approve</button>
                   <button class="btn btn-danger btn-sm reject-btn" data-id="${record.id}">Reject</button>` : ''}
                <button class="btn btn-secondary btn-sm view-btn" data-id="${record.id}">View Details</button>
            </td>
        `;
        
        requestsTable.appendChild(row);
    });
    
    // Set up action buttons
    setupRequestActionButtons();
}

// Set up borrow request filters
function setupBorrowFilters() {
    const searchInput = document.getElementById('search-requests');
    const resetFiltersBtn = document.getElementById('reset-request-filters');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadBorrowRequests();
        }, 300));
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            loadBorrowRequests();
        });
    }
}

// Setup action buttons for borrow requests
function setupRequestActionButtons() {
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
            
            // Reload requests table
            loadBorrowRequests();
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
            
            // Create form for rejection reason
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="reject-form">
                    <div class="form-group">
                        <label for="reject-reason">Reason for Rejection</label>
                        <textarea id="reject-reason" name="reject-reason" rows="3" required></textarea>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Reject Request', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Reject Request',
                    class: 'btn-danger',
                    callback: () => {
                        const form = document.getElementById('reject-form');
                        if (form.checkValidity()) {
                            const reason = document.getElementById('reject-reason').value;
                            
                            // Update record status
                            record.status = 'rejected';
                            record.rejectionReason = reason;
                            saveBorrowRecord(record);
                            
                            // Get item and user
                            const item = getInventoryItem(record.itemId);
                            const user = getUserById(record.userId);
                            
                            // Create notification for user
                            if (user) {
                                const notification = {
                                    type: 'request_rejected',
                                    title: 'Request Rejected',
                                    message: `Your request to borrow ${record.quantity} ${item.name}(s) has been rejected: ${reason}`,
                                    itemId: record.itemId,
                                    userId: record.userId,
                                    recordId: record.id,
                                    severity: 'danger'
                                };
                                
                                addNotification(notification);
                            }
                            
                            // Show success message
                            showFlashMessage('Request rejected successfully!', 'success');
                            
                            // Reload requests table
                            loadBorrowRequests();
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
    });
    
    // View details buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.getAttribute('data-id');
            const record = getBorrowRecord(recordId);
            
            if (!record) {
                showFlashMessage('Record not found', 'error');
                return;
            }
            
            // Get item and user
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            if (!item || !user) {
                showFlashMessage('Item or user not found', 'error');
                return;
            }
            
            // Create content for modal
            const content = `
                <div class="request-details">
                    <div class="form-group">
                        <div class="item-info-label">Requester</div>
                        <div>${user.username} (${user.role})</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Item</div>
                        <div>${item.name}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Quantity</div>
                        <div>${record.quantity}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Request Date</div>
                        <div>${formatDateTime(record.requestDate)}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Due Date</div>
                        <div>${formatDate(record.dueDate)}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Purpose</div>
                        <div>${record.purpose}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Item Details</div>
                        <div>
                            <strong>Category:</strong> ${item.category}<br>
                            <strong>Location:</strong> ${item.location}<br>
                            <strong>Available Quantity:</strong> ${item.availableQuantity || item.quantity}
                        </div>
                    </div>
                </div>
            `;
            
            // Create modal with content
            const modal = createModal('Request Details', content, [
                {
                    text: 'Close',
                    class: 'btn-secondary'
                }
            ]);
        });
    });
}

// Load all borrowed items for return
function loadBorrowedItems() {
    const returnsTable = document.getElementById('returns-table');
    if (!returnsTable) return;
    
    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    // Get all borrow records
    let borrowRecords = getBorrowRecords();
    
    // Filter records based on user role
    if (currentUser.role === 'admin' || currentUser.role === 'coach') {
        // Admins and coaches can see all approved (active) borrows
        borrowRecords = borrowRecords.filter(record => record.status === 'approved');
    } else {
        // Regular users can only see their own approved borrows
        borrowRecords = borrowRecords.filter(record => 
            record.userId === currentUser.id && 
            record.status === 'approved'
        );
    }
    
    // Apply any existing filters
    const searchInput = document.getElementById('search-returns');
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        borrowRecords = borrowRecords.filter(record => {
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            return item.name.toLowerCase().includes(searchTerm) ||
                  (user && user.username.toLowerCase().includes(searchTerm));
        });
    }
    
    const overdueFilter = document.getElementById('overdue-filter');
    if (overdueFilter && overdueFilter.checked) {
        // Show only overdue items
        const today = new Date();
        borrowRecords = borrowRecords.filter(record =>
            new Date(record.dueDate) < today
        );
    }
    
    // Sort by due date (earliest first)
    borrowRecords.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Clear table
    returnsTable.innerHTML = '';
    
    if (borrowRecords.length === 0) {
        // Show no items message
        returnsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No borrowed items found</td>
            </tr>
        `;
        return;
    }
    
    // Populate table with borrowed items
    borrowRecords.forEach(record => {
        const item = getInventoryItem(record.itemId);
        const user = getUserById(record.userId);
        
        if (!item || !user) return;
        
        // Check if item is overdue
        const today = new Date();
        const dueDate = new Date(record.dueDate);
        const isOverdue = dueDate < today;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${item.name}</td>
            <td>${record.quantity}</td>
            <td>${formatDate(record.requestDate)}</td>
            <td class="${isOverdue ? 'status-unavailable' : ''}">${formatDate(record.dueDate)}</td>
            <td>${isOverdue ? 'Overdue' : 'Active'}</td>
            <td>
                <button class="btn btn-primary btn-sm return-btn" data-id="${record.id}">Return</button>
                <button class="btn btn-secondary btn-sm view-btn" data-id="${record.id}">View Details</button>
            </td>
        `;
        
        returnsTable.appendChild(row);
    });
    
    // Set up action buttons
    setupReturnActionButtons();
}

// Set up returns filters
function setupReturnsFilters() {
    const searchInput = document.getElementById('search-returns');
    const overdueFilter = document.getElementById('overdue-filter');
    const resetFiltersBtn = document.getElementById('reset-return-filters');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            loadBorrowedItems();
        }, 300));
    }
    
    if (overdueFilter) {
        overdueFilter.addEventListener('change', () => {
            loadBorrowedItems();
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (overdueFilter) overdueFilter.checked = false;
            loadBorrowedItems();
        });
    }
}

// Setup action buttons for returns
function setupReturnActionButtons() {
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
            
            // Get item and user
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            if (!item || !user) {
                showFlashMessage('Item or user not found', 'error');
                return;
            }
            
            // Create form for condition assessment
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <form id="return-form">
                    <div class="form-group">
                        <label for="return-condition">Item Condition</label>
                        <select id="return-condition" name="return-condition" required>
                            <option value="Excellent">Excellent</option>
                            <option value="Good" selected>Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                            <option value="Damaged">Damaged</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="return-notes">Notes</label>
                        <textarea id="return-notes" name="return-notes" rows="3"></textarea>
                    </div>
                </form>
            `;
            
            // Create modal with form
            const modal = createModal('Return Item', formContent, [
                {
                    text: 'Cancel',
                    class: 'btn-secondary'
                },
                {
                    text: 'Confirm Return',
                    class: 'btn-primary',
                    callback: () => {
                        const form = document.getElementById('return-form');
                        if (form.checkValidity()) {
                            const condition = document.getElementById('return-condition').value;
                            const notes = document.getElementById('return-notes').value;
                            
                            // Update record status
                            record.status = 'returned';
                            record.returnDate = new Date().toISOString();
                            record.returnCondition = condition;
                            record.returnNotes = notes;
                            saveBorrowRecord(record);
                            
                            // Create notification for admins
                            const notification = {
                                type: 'item_returned',
                                title: 'Item Returned',
                                message: `${user.username} has returned ${record.quantity} ${item.name}(s).`,
                                itemId: record.itemId,
                                userId: record.userId,
                                recordId: record.id,
                                severity: 'success'
                            };
                            
                            addNotification(notification);
                            
                            // Check if item condition has changed
                            if (condition === 'Poor' || condition === 'Damaged') {
                                const damageNotification = {
                                    type: 'item_damaged',
                                    title: 'Item Condition Alert',
                                    message: `${item.name} returned in ${condition} condition: ${notes}`,
                                    itemId: record.itemId,
                                    userId: record.userId,
                                    recordId: record.id,
                                    severity: 'warning'
                                };
                                
                                addNotification(damageNotification);
                            }
                            
                            // Show success message
                            showFlashMessage('Item returned successfully!', 'success');
                            
                            // Reload borrowed items table
                            loadBorrowedItems();
                        } else {
                            form.reportValidity();
                            return false; // Prevent modal from closing
                        }
                    }
                }
            ]);
        });
    });
    
    // View details buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.getAttribute('data-id');
            const record = getBorrowRecord(recordId);
            
            if (!record) {
                showFlashMessage('Record not found', 'error');
                return;
            }
            
            // Get item and user
            const item = getInventoryItem(record.itemId);
            const user = getUserById(record.userId);
            
            if (!item || !user) {
                showFlashMessage('Item or user not found', 'error');
                return;
            }
            
            // Check if item is overdue
            const today = new Date();
            const dueDate = new Date(record.dueDate);
            const isOverdue = dueDate < today;
            const daysOverdue = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
            
            // Create content for modal
            const content = `
                <div class="borrow-details">
                    <div class="form-group">
                        <div class="item-info-label">Borrower</div>
                        <div>${user.username} (${user.role})</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Item</div>
                        <div>${item.name}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Quantity</div>
                        <div>${record.quantity}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Borrow Date</div>
                        <div>${formatDateTime(record.requestDate)}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Due Date</div>
                        <div class="${isOverdue ? 'status-unavailable' : ''}">${formatDate(record.dueDate)}
                            ${isOverdue ? ` (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue)` : ''}
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Purpose</div>
                        <div>${record.purpose}</div>
                    </div>
                    <div class="form-group">
                        <div class="item-info-label">Item Details</div>
                        <div>
                            <strong>Category:</strong> ${item.category}<br>
                            <strong>Location:</strong> ${item.location}<br>
                            <strong>Condition:</strong> ${item.condition}
                        </div>
                    </div>
                </div>
            `;
            
            // Create modal with content
            const modal = createModal('Borrow Details', content, [
                {
                    text: 'Close',
                    class: 'btn-secondary'
                },
                {
                    text: 'Return Now',
                    class: 'btn-primary',
                    callback: () => {
                        // Trigger return button click
                        document.querySelector(`.return-btn[data-id="${recordId}"]`).click();
                        return false; // Prevent this modal from closing
                    }
                }
            ]);
        });
    });
}
