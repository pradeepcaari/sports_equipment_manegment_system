// Data Module - Handles localStorage interactions

// Get all inventory items
function getInventory() {
    return JSON.parse(localStorage.getItem('inventory')) || [];
}

// Get a specific inventory item by ID
function getInventoryItem(itemId) {
    const inventory = getInventory();
    return inventory.find(item => item.id === itemId);
}

// Save inventory item
function saveInventoryItem(item) {
    const inventory = getInventory();
    const index = inventory.findIndex(i => i.id === item.id);
    
    // Update lastUpdated timestamp
    item.lastUpdated = new Date().toISOString();
    
    if (index !== -1) {
        // Update existing item
        inventory[index] = item;
    } else {
        // Add new item
        if (!item.id) {
            item.id = generateItemId();
        }
        inventory.push(item);
    }
    
    localStorage.setItem('inventory', JSON.stringify(inventory));
    
    // Check if item is below threshold and create notification if needed
    checkLowStockAndNotify(item);
    
    return item;
}

// Delete inventory item
function deleteInventoryItem(itemId) {
    const inventory = getInventory();
    const updatedInventory = inventory.filter(item => item.id !== itemId);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
    
    // Also delete any related borrow records
    const borrowRecords = getBorrowRecords();
    const updatedRecords = borrowRecords.filter(record => record.itemId !== itemId);
    localStorage.setItem('borrowRecords', JSON.stringify(updatedRecords));
}

// Get all borrow records
function getBorrowRecords() {
    return JSON.parse(localStorage.getItem('borrowRecords')) || [];
}

// Get borrow records by user ID
function getUserBorrowRecords(userId) {
    const records = getBorrowRecords();
    return records.filter(record => record.userId === userId);
}

// Get borrow records by item ID
function getItemBorrowRecords(itemId) {
    const records = getBorrowRecords();
    return records.filter(record => record.itemId === itemId);
}

// Get a specific borrow record by ID
function getBorrowRecord(recordId) {
    const records = getBorrowRecords();
    return records.find(record => record.id === recordId);
}

// Save borrow record
function saveBorrowRecord(record) {
    const records = getBorrowRecords();
    const index = records.findIndex(r => r.id === record.id);
    
    if (index !== -1) {
        // Update existing record
        records[index] = record;
    } else {
        // Add new record
        if (!record.id) {
            record.id = generateRecordId();
        }
        records.push(record);
    }
    
    localStorage.setItem('borrowRecords', JSON.stringify(records));
    
    // Update inventory quantity
    updateInventoryQuantity(record.itemId);
    
    // Check for overdue items
    checkOverdueAndNotify();
    
    return record;
}

// Delete borrow record
function deleteBorrowRecord(recordId) {
    const records = getBorrowRecords();
    const recordToDelete = records.find(r => r.id === recordId);
    const updatedRecords = records.filter(record => record.id !== recordId);
    localStorage.setItem('borrowRecords', JSON.stringify(updatedRecords));
    
    // Update inventory quantity if a record was deleted
    if (recordToDelete) {
        updateInventoryQuantity(recordToDelete.itemId);
    }
}

// Update inventory quantity based on borrow records
function updateInventoryQuantity(itemId) {
    const item = getInventoryItem(itemId);
    if (!item) return;
    
    // Get all active borrow records for this item
    const activeRecords = getBorrowRecords().filter(
        record => record.itemId === itemId && 
                 record.status !== 'returned'
    );
    
    // Calculate total borrowed quantity
    const borrowedQuantity = activeRecords.reduce(
        (total, record) => total + record.quantity, 0
    );
    
    // Update available quantity in the inventory
    item.availableQuantity = item.quantity - borrowedQuantity;
    
    // Save updated item
    saveInventoryItem(item);
}

// Get all notifications
function getNotifications() {
    return JSON.parse(localStorage.getItem('notifications')) || [];
}

// Get unread notifications count
function getUnreadNotificationsCount() {
    const notifications = getNotifications();
    return notifications.filter(notification => !notification.read).length;
}

// Add a notification
function addNotification(notification) {
    const notifications = getNotifications();
    
    // Add new notification
    if (!notification.id) {
        notification.id = generateNotificationId();
    }
    notification.timestamp = new Date().toISOString();
    notification.read = false;
    
    notifications.push(notification);
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 50 notifications
    const limitedNotifications = notifications.slice(0, 50);
    
    localStorage.setItem('notifications', JSON.stringify(limitedNotifications));
    
    return notification;
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const notifications = getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
        notification.read = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    const notifications = getNotifications();
    
    notifications.forEach(notification => {
        notification.read = true;
    });
    
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// Delete notification
function deleteNotification(notificationId) {
    const notifications = getNotifications();
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
}

// Get all users
function getUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
}

// Get user by ID
function getUserById(userId) {
    const users = getUsers();
    return users.find(user => user.id === userId);
}

// Get user by username
function getUserByUsername(username) {
    const users = getUsers();
    return users.find(user => user.username === username);
}

// Generate unique IDs
function generateItemId() {
    return 'item_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function generateRecordId() {
    return 'rec_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function generateNotificationId() {
    return 'notif_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Check for low stock and create notifications
function checkLowStockAndNotify(item) {
    if (item.availableQuantity === undefined) {
        item.availableQuantity = item.quantity;
    }
    
    if (item.availableQuantity <= item.threshold) {
        // Create low stock notification
        const notification = {
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${item.name} is running low (${item.availableQuantity} available).`,
            itemId: item.id,
            severity: 'warning'
        };
        
        // Check if a similar notification already exists
        const existingNotifications = getNotifications();
        const similarNotification = existingNotifications.find(
            n => n.type === 'low_stock' && n.itemId === item.id
        );
        
        // Only add if no similar notification exists or it's been more than a day
        if (!similarNotification || (
            new Date().getTime() - new Date(similarNotification.timestamp).getTime() > 86400000
        )) {
            addNotification(notification);
        }
    }
}

// Check for overdue items and create notifications
function checkOverdueAndNotify() {
    const today = new Date();
    const borrowRecords = getBorrowRecords();
    
    // Find overdue records
    borrowRecords.forEach(record => {
        if (record.status === 'approved' && record.dueDate) {
            const dueDate = new Date(record.dueDate);
            
            // Check if due date has passed
            if (today > dueDate && record.status !== 'returned') {
                // Get user info
                const user = getUserById(record.userId);
                const item = getInventoryItem(record.itemId);
                
                if (user && item) {
                    // Create overdue notification
                    const notification = {
                        type: 'overdue',
                        title: 'Overdue Item',
                        message: `${user.username} has not returned ${item.name} (Due: ${formatDate(dueDate)})`,
                        recordId: record.id,
                        userId: user.id,
                        itemId: item.id,
                        severity: 'danger'
                    };
                    
                    // Check if a similar notification already exists
                    const existingNotifications = getNotifications();
                    const similarNotification = existingNotifications.find(
                        n => n.type === 'overdue' && n.recordId === record.id
                    );
                    
                    // Only add if no similar notification exists or it's been more than a day
                    if (!similarNotification || (
                        new Date().getTime() - new Date(similarNotification.timestamp).getTime() > 86400000
                    )) {
                        addNotification(notification);
                    }
                }
            }
        }
    });
}

// Format date for display
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
}
