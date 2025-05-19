// Notifications Module

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the notifications page
    if (document.getElementById('notifications-container')) {
        // Load all notifications
        loadNotifications();
        
        // Set up mark all as read button
        setupMarkAllReadButton();
    }
    
    // Update notification badge in the navbar
    updateNotificationBadge();
});

// Load all notifications
function loadNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    // Get all notifications
    let notifications = getNotifications();
    
    // Filter notifications based on user role
    if (currentUser.role === 'admin') {
        // Admins can see all notifications
    } else if (currentUser.role === 'coach') {
        // Coaches can see their own notifications and all borrow requests
        notifications = notifications.filter(notification => 
            notification.userId === currentUser.id || 
            notification.type === 'borrow_request' ||
            notification.type === 'low_stock' ||
            notification.type === 'item_returned'
        );
    } else {
        // Regular users can only see their own notifications
        notifications = notifications.filter(notification => 
            notification.userId === currentUser.id ||
            (notification.type === 'item_returned' && notification.userId === currentUser.id)
        );
    }
    
    // Clear list
    notificationsList.innerHTML = '';
    
    if (notifications.length === 0) {
        // Show no notifications message
        notificationsList.innerHTML = `
            <div class="notification-item">
                <div class="notification-content">
                    <div class="notification-title">No notifications found</div>
                    <div class="notification-message">You're all caught up!</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Populate list with notifications
    notifications.forEach(notification => {
        // Determine icon based on notification type and severity
        let iconClass = 'fas fa-bell';
        if (notification.type === 'low_stock') {
            iconClass = 'fas fa-exclamation-triangle';
        } else if (notification.type === 'overdue') {
            iconClass = 'fas fa-clock';
        } else if (notification.type === 'borrow_request') {
            iconClass = 'fas fa-hand-holding';
        } else if (notification.type === 'request_approved') {
            iconClass = 'fas fa-check-circle';
        } else if (notification.type === 'request_rejected') {
            iconClass = 'fas fa-times-circle';
        } else if (notification.type === 'item_returned') {
            iconClass = 'fas fa-undo';
        } else if (notification.type === 'item_damaged') {
            iconClass = 'fas fa-tools';
        }
        
        // Create notification element
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read ? 'notification-read' : ''} notification-${notification.type}`;
        notificationItem.setAttribute('data-id', notification.id);
        
        notificationItem.innerHTML = `
            <div class="notification-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatDateTime(notification.timestamp)}</div>
            </div>
            <div class="notification-actions">
                <button class="btn btn-sm ${notification.read ? 'btn-secondary mark-unread-btn' : 'btn-primary mark-read-btn'}">
                    ${notification.read ? 'Mark as Unread' : 'Mark as Read'}
                </button>
                <button class="btn btn-danger btn-sm delete-notification-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        notificationsList.appendChild(notificationItem);
        
        // If this is an unread notification, mark it as read when viewed
        if (!notification.read) {
            markNotificationAsRead(notification.id);
        }
    });
    
    // Set up action buttons
    setupNotificationActionButtons();
    
    // Update badge count
    updateNotificationBadge();
}

// Set up mark all as read button
function setupMarkAllReadButton() {
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    if (!markAllReadBtn) return;
    
    markAllReadBtn.addEventListener('click', () => {
        // Mark all notifications as read
        markAllNotificationsAsRead();
        
        // Show success message
        showFlashMessage('All notifications marked as read', 'success');
        
        // Reload notifications
        loadNotifications();
        
        // Update badge count
        updateNotificationBadge();
    });
}

// Set up notification action buttons
function setupNotificationActionButtons() {
    // Mark as read buttons
    const markReadButtons = document.querySelectorAll('.mark-read-btn');
    markReadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationItem = this.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            // Mark notification as read
            markNotificationAsRead(notificationId);
            
            // Update button text and class
            this.textContent = 'Mark as Unread';
            this.classList.remove('btn-primary');
            this.classList.add('btn-secondary');
            this.classList.remove('mark-read-btn');
            this.classList.add('mark-unread-btn');
            
            // Add read class to notification item
            notificationItem.classList.add('notification-read');
            
            // Update badge count
            updateNotificationBadge();
        });
    });
    
    // Mark as unread buttons
    const markUnreadButtons = document.querySelectorAll('.mark-unread-btn');
    markUnreadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationItem = this.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            // Get notification
            const notifications = getNotifications();
            const notification = notifications.find(n => n.id === notificationId);
            
            if (notification) {
                // Mark as unread
                notification.read = false;
                localStorage.setItem('notifications', JSON.stringify(notifications));
                
                // Update button text and class
                this.textContent = 'Mark as Read';
                this.classList.remove('btn-secondary');
                this.classList.add('btn-primary');
                this.classList.remove('mark-unread-btn');
                this.classList.add('mark-read-btn');
                
                // Remove read class from notification item
                notificationItem.classList.remove('notification-read');
                
                // Update badge count
                updateNotificationBadge();
            }
        });
    });
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-notification-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationItem = this.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            
            // Delete notification
            deleteNotification(notificationId);
            
            // Remove notification item from DOM
            notificationItem.remove();
            
            // Show success message
            showFlashMessage('Notification deleted', 'success');
            
            // Check if no notifications left
            const notificationsList = document.getElementById('notifications-list');
            if (notificationsList.children.length === 0) {
                notificationsList.innerHTML = `
                    <div class="notification-item">
                        <div class="notification-content">
                            <div class="notification-title">No notifications found</div>
                            <div class="notification-message">You're all caught up!</div>
                        </div>
                    </div>
                `;
            }
            
            // Update badge count
            updateNotificationBadge();
        });
    });
    
    // Add action buttons for specific notification types
    setupTypeSpecificActions();
}

// Set up type-specific action buttons for notifications
function setupTypeSpecificActions() {
    // Get all notifications
    const notifications = getNotifications();
    
    // For each notification type, add appropriate action buttons
    notifications.forEach(notification => {
        const notificationItem = document.querySelector(`.notification-item[data-id="${notification.id}"]`);
        if (!notificationItem) return;
        
        const actionsContainer = notificationItem.querySelector('.notification-actions');
        
        // Add action buttons based on notification type
        if (notification.type === 'borrow_request' && notification.recordId) {
            // Add approve/reject buttons for borrow requests
            const currentUser = getCurrentUser();
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'coach')) {
                const record = getBorrowRecord(notification.recordId);
                if (record && record.status === 'pending') {
                    const actionButton = document.createElement('button');
                    actionButton.className = 'btn btn-success btn-sm view-request-btn';
                    actionButton.textContent = 'View Request';
                    actionButton.setAttribute('data-id', notification.recordId);
                    actionButton.addEventListener('click', function() {
                        window.location.href = 'borrow.html';
                    });
                    
                    actionsContainer.insertBefore(actionButton, actionsContainer.firstChild);
                }
            }
        } else if (notification.type === 'overdue' && notification.recordId) {
            // Add view button for overdue items
            const currentUser = getCurrentUser();
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'coach' || 
                              (currentUser.id === notification.userId))) {
                const actionButton = document.createElement('button');
                actionButton.className = 'btn btn-warning btn-sm view-overdue-btn';
                actionButton.textContent = 'View Item';
                actionButton.setAttribute('data-id', notification.recordId);
                actionButton.addEventListener('click', function() {
                    window.location.href = 'returns.html';
                });
                
                actionsContainer.insertBefore(actionButton, actionsContainer.firstChild);
            }
        } else if (notification.type === 'low_stock' && notification.itemId) {
            // Add view button for low stock items
            const currentUser = getCurrentUser();
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'coach')) {
                const actionButton = document.createElement('button');
                actionButton.className = 'btn btn-warning btn-sm view-item-btn';
                actionButton.textContent = 'View Item';
                actionButton.setAttribute('data-id', notification.itemId);
                actionButton.addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    window.location.href = `inventory-detail.html?id=${itemId}`;
                });
                
                actionsContainer.insertBefore(actionButton, actionsContainer.firstChild);
            }
        }
    });
}

// Check for new notifications
function checkForNewNotifications() {
    // This would typically poll a server, but for our LocalStorage implementation,
    // we'll check for overdue items and low stock instead
    
    checkOverdueAndNotify();
    
    // For each inventory item, check stock levels
    const inventory = getInventory();
    inventory.forEach(item => {
        checkLowStockAndNotify(item);
    });
    
    // Update badge count
    updateNotificationBadge();
}

// Update notification badge in navbar
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge .badge');
    if (badge) {
        const count = getUnreadNotificationsCount();
        badge.textContent = count;
        
        // Show/hide badge based on count
        if (count > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Style for read/unread notifications - add to DOM
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .notification-read {
            background-color: #f8f9fa;
            opacity: 0.8;
        }
        
        .notification-read .notification-icon {
            opacity: 0.6;
        }
    `;
    document.head.appendChild(style);
    
    // Set up periodic check for new notifications
    setInterval(checkForNewNotifications, 60000); // Check every minute
});
