// Reports Module

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the reports page
    if (document.getElementById('reports-container')) {
        // Initialize report selection
        initReportSelection();
        
        // Load default report (equipment usage)
        generateEquipmentUsageReport();
    }
});

// Initialize report selection dropdown
function initReportSelection() {
    const reportSelector = document.getElementById('report-selector');
    if (!reportSelector) return;
    
    reportSelector.addEventListener('change', function() {
        const reportType = this.value;
        
        // Clear existing report
        clearReportDisplay();
        
        // Generate selected report
        switch(reportType) {
            case 'equipment-usage':
                generateEquipmentUsageReport();
                break;
            case 'overdue-items':
                generateOverdueItemsReport();
                break;
            case 'inventory-status':
                generateInventoryStatusReport();
                break;
            case 'user-activity':
                generateUserActivityReport();
                break;
            case 'low-stock':
                generateLowStockReport();
                break;
            default:
                // Default to equipment usage report
                generateEquipmentUsageReport();
        }
    });
}

// Clear the report display area
function clearReportDisplay() {
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
        reportContent.innerHTML = '';
    }
}

// Generate Equipment Usage Report
function generateEquipmentUsageReport() {
    // Get borrow records
    const borrowRecords = getBorrowRecords();
    
    // Get inventory items
    const inventory = getInventory();
    
    // Create report container
    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = `
        <h3>Equipment Usage Report</h3>
        <div class="report-filters mb-3">
            <div class="form-group">
                <label for="time-period">Time Period:</label>
                <select id="time-period" class="form-control">
                    <option value="7">Last 7 Days</option>
                    <option value="30" selected>Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="365">Last Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>
        </div>
        <div class="chart-container mb-4">
            <canvas id="usage-chart"></canvas>
        </div>
        <div class="table-responsive">
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Times Borrowed</th>
                        <th>Total Quantity Borrowed</th>
                        <th>Average Duration (days)</th>
                    </tr>
                </thead>
                <tbody id="usage-table-body">
                </tbody>
            </table>
        </div>
    `;
    
    // Add event listener to time period selector
    document.getElementById('time-period').addEventListener('change', function() {
        updateEquipmentUsageReport(this.value);
    });
    
    // Initial report with 30 days as default
    updateEquipmentUsageReport('30');
}

// Update Equipment Usage Report based on time period
function updateEquipmentUsageReport(days) {
    // Get borrow records
    const borrowRecords = getBorrowRecords();
    
    // Get inventory items
    const inventory = getInventory();
    
    // Filter records by time period
    const today = new Date();
    const startDate = new Date();
    
    if (days !== 'all') {
        startDate.setDate(today.getDate() - parseInt(days));
    } else {
        // Set to a very old date for "all time"
        startDate.setFullYear(2000);
    }
    
    // Filter to only include approved or returned records within the time period
    const filteredRecords = borrowRecords.filter(record => {
        const recordDate = new Date(record.requestDate);
        return (record.status === 'approved' || record.status === 'returned') && 
               recordDate >= startDate && recordDate <= today;
    });
    
    // Calculate usage statistics by item
    const usageStats = {};
    
    // Initialize all inventory items with zero stats
    inventory.forEach(item => {
        usageStats[item.id] = {
            id: item.id,
            name: item.name,
            category: item.category,
            timesBorrowed: 0,
            totalQuantity: 0,
            totalDuration: 0, // In days
            averageDuration: 0
        };
    });
    
    // Accumulate stats from borrow records
    filteredRecords.forEach(record => {
        if (!usageStats[record.itemId]) return;
        
        usageStats[record.itemId].timesBorrowed += 1;
        usageStats[record.itemId].totalQuantity += record.quantity;
        
        // Calculate duration
        const borrowDate = new Date(record.requestDate);
        const returnDate = record.returnDate ? new Date(record.returnDate) : new Date();
        const durationDays = Math.ceil((returnDate - borrowDate) / (1000 * 60 * 60 * 24));
        
        usageStats[record.itemId].totalDuration += durationDays;
    });
    
    // Calculate average durations
    Object.values(usageStats).forEach(stat => {
        if (stat.timesBorrowed > 0) {
            stat.averageDuration = Math.round(stat.totalDuration / stat.timesBorrowed);
        }
    });
    
    // Sort by times borrowed (descending)
    const sortedStats = Object.values(usageStats).sort((a, b) => b.timesBorrowed - a.timesBorrowed);
    
    // Update table
    const tableBody = document.getElementById('usage-table-body');
    tableBody.innerHTML = '';
    
    if (sortedStats.length === 0 || sortedStats.every(stat => stat.timesBorrowed === 0)) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No borrow activity found in the selected time period</td>
            </tr>
        `;
    } else {
        sortedStats.forEach(stat => {
            if (stat.timesBorrowed > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${stat.name}</td>
                    <td>${stat.category}</td>
                    <td>${stat.timesBorrowed}</td>
                    <td>${stat.totalQuantity}</td>
                    <td>${stat.averageDuration}</td>
                `;
                tableBody.appendChild(row);
            }
        });
    }
    
    // Prepare data for chart
    // Only include top 10 items for clarity
    const chartData = sortedStats.slice(0, 10);
    
    // Create chart
    const ctx = document.getElementById('usage-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.usageChart) {
        window.usageChart.destroy();
    }
    
    window.usageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(stat => stat.name),
            datasets: [
                {
                    label: 'Times Borrowed',
                    data: chartData.map(stat => stat.timesBorrowed),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Quantity',
                    data: chartData.map(stat => stat.totalQuantity),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Equipment'
                    }
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Equipment Usage (${days === 'all' ? 'All Time' : `Last ${days} Days`})`
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Generate Overdue Items Report
function generateOverdueItemsReport() {
    // Get borrow records
    const borrowRecords = getBorrowRecords();
    
    // Get inventory items
    const inventory = getInventory();
    
    // Get users
    const users = getUsers();
    
    // Create report container
    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = `
        <h3>Overdue Items Report</h3>
        <div class="chart-container mb-4">
            <canvas id="overdue-chart"></canvas>
        </div>
        <div class="table-responsive">
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Borrower</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                        <th>Quantity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="overdue-table-body">
                </tbody>
            </table>
        </div>
    `;
    
    // Filter for overdue items
    const today = new Date();
    const overdueRecords = borrowRecords.filter(record => {
        const dueDate = new Date(record.dueDate);
        return record.status === 'approved' && dueDate < today;
    });
    
    // Sort by most overdue first
    overdueRecords.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Update table
    const tableBody = document.getElementById('overdue-table-body');
    
    if (overdueRecords.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No overdue items found</td>
            </tr>
        `;
    } else {
        overdueRecords.forEach(record => {
            const item = inventory.find(i => i.id === record.itemId);
            const user = users.find(u => u.id === record.userId);
            
            if (!item || !user) return;
            
            const dueDate = new Date(record.dueDate);
            const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${user.username}</td>
                <td>${formatDate(record.dueDate)}</td>
                <td class="status-unavailable">${daysOverdue}</td>
                <td>${record.quantity}</td>
                <td>
                    <button class="btn btn-primary btn-sm notify-btn" data-id="${record.id}">Send Reminder</button>
                    <button class="btn btn-success btn-sm return-btn" data-id="${record.id}">Record Return</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        tableBody.querySelectorAll('.notify-btn').forEach(button => {
            button.addEventListener('click', function() {
                const recordId = this.getAttribute('data-id');
                sendOverdueReminder(recordId);
            });
        });
        
        tableBody.querySelectorAll('.return-btn').forEach(button => {
            button.addEventListener('click', function() {
                const recordId = this.getAttribute('data-id');
                recordOverdueReturn(recordId);
            });
        });
    }
    
    // Prepare data for chart - group by days overdue
    const overdueGroups = {
        '1-7': 0,
        '8-14': 0, 
        '15-30': 0,
        '30+': 0
    };
    
    overdueRecords.forEach(record => {
        const dueDate = new Date(record.dueDate);
        const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue <= 7) {
            overdueGroups['1-7']++;
        } else if (daysOverdue <= 14) {
            overdueGroups['8-14']++;
        } else if (daysOverdue <= 30) {
            overdueGroups['15-30']++;
        } else {
            overdueGroups['30+']++;
        }
    });
    
    // Create chart
    const ctx = document.getElementById('overdue-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.overdueChart) {
        window.overdueChart.destroy();
    }
    
    window.overdueChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(overdueGroups),
            datasets: [{
                data: Object.values(overdueGroups),
                backgroundColor: [
                    'rgba(255, 206, 86, 0.7)',   // 1-7 days: yellow
                    'rgba(255, 159, 64, 0.7)',   // 8-14 days: orange
                    'rgba(255, 99, 132, 0.7)',   // 15-30 days: red
                    'rgba(153, 102, 255, 0.7)'   // 30+ days: purple
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Overdue Items by Duration (Days)'
                },
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Send reminder for overdue item
function sendOverdueReminder(recordId) {
    const record = getBorrowRecord(recordId);
    if (!record) {
        showFlashMessage('Record not found', 'error');
        return;
    }
    
    const item = getInventoryItem(record.itemId);
    const user = getUserById(record.userId);
    
    if (!item || !user) {
        showFlashMessage('Item or user not found', 'error');
        return;
    }
    
    // Create notification for user
    const notification = {
        type: 'overdue_reminder',
        title: 'Overdue Item Reminder',
        message: `Please return the ${item.name} that was due on ${formatDate(record.dueDate)}.`,
        userId: user.id,
        itemId: item.id,
        recordId: record.id,
        severity: 'danger'
    };
    
    addNotification(notification);
    
    showFlashMessage('Reminder sent successfully!', 'success');
}

// Record return for overdue item
function recordOverdueReturn(recordId) {
    const record = getBorrowRecord(recordId);
    if (!record) {
        showFlashMessage('Record not found', 'error');
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
    const modal = createModal('Record Item Return', formContent, [
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
                    
                    // Get item and user
                    const item = getInventoryItem(record.itemId);
                    const user = getUserById(record.userId);
                    
                    // Create notification for user
                    if (user) {
                        const notification = {
                            type: 'item_returned',
                            title: 'Item Returned',
                            message: `Your overdue ${item.name} has been marked as returned.`,
                            userId: user.id,
                            itemId: record.itemId,
                            recordId: record.id,
                            severity: 'info'
                        };
                        
                        addNotification(notification);
                    }
                    
                    // Check if item condition has changed
                    if (condition === 'Poor' || condition === 'Damaged') {
                        const damageNotification = {
                            type: 'item_damaged',
                            title: 'Item Condition Alert',
                            message: `${item.name} returned in ${condition} condition: ${notes}`,
                            itemId: record.itemId,
                            severity: 'warning'
                        };
                        
                        addNotification(damageNotification);
                    }
                    
                    // Show success message
                    showFlashMessage('Item returned successfully!', 'success');
                    
                    // Refresh report
                    generateOverdueItemsReport();
                } else {
                    form.reportValidity();
                    return false; // Prevent modal from closing
                }
            }
        }
    ]);
}

// Generate Inventory Status Report
function generateInventoryStatusReport() {
    // Get inventory items
    const inventory = getInventory();
    
    // Create report container
    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = `
        <h3>Inventory Status Report</h3>
        <div class="report-filters mb-3 d-flex">
            <div class="form-group mr-3">
                <label for="category-filter">Category:</label>
                <select id="category-filter" class="form-control">
                    <option value="all" selected>All Categories</option>
                </select>
            </div>
            <div class="form-group">
                <label for="status-filter">Status:</label>
                <select id="status-filter" class="form-control">
                    <option value="all" selected>All Statuses</option>
                    <option value="available">Available</option>
                    <option value="low">Low Stock</option>
                    <option value="unavailable">Unavailable</option>
                </select>
            </div>
        </div>
        <div class="chart-container mb-4">
            <canvas id="inventory-chart"></canvas>
        </div>
        <div class="table-responsive">
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Available / Total</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Last Updated</th>
                    </tr>
                </thead>
                <tbody id="inventory-table-body">
                </tbody>
            </table>
        </div>
    `;
    
    // Populate category filter
    const categoryFilter = document.getElementById('category-filter');
    const categories = [...new Set(inventory.map(item => item.category))];
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Add event listeners to filters
    categoryFilter.addEventListener('change', updateInventoryStatusReport);
    document.getElementById('status-filter').addEventListener('change', updateInventoryStatusReport);
    
    // Initial report
    updateInventoryStatusReport();
}

// Update Inventory Status Report
function updateInventoryStatusReport() {
    // Get filters
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    
    // Get inventory items
    let inventory = getInventory();
    
    // Ensure available quantities are up to date
    inventory.forEach(item => {
        updateInventoryQuantity(item.id);
    });
    
    // Refresh inventory after updating quantities
    inventory = getInventory();
    
    // Apply filters
    if (categoryValue !== 'all') {
        inventory = inventory.filter(item => item.category === categoryValue);
    }
    
    if (statusValue !== 'all') {
        inventory = inventory.filter(item => {
            const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
            
            if (statusValue === 'available') {
                return availableQty > item.threshold;
            } else if (statusValue === 'low') {
                return availableQty > 0 && availableQty <= item.threshold;
            } else if (statusValue === 'unavailable') {
                return availableQty === 0;
            }
            return true;
        });
    }
    
    // Update table
    const tableBody = document.getElementById('inventory-table-body');
    tableBody.innerHTML = '';
    
    if (inventory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No items found matching the selected filters</td>
            </tr>
        `;
    } else {
        inventory.forEach(item => {
            const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
            const statusClass = getStatusClass(availableQty, item.threshold);
            const statusText = getStatusText(availableQty, item.threshold);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${availableQty} / ${item.quantity}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${item.location}</td>
                <td>${formatDate(item.lastUpdated)}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // Prepare data for chart - group by status
    const statusCounts = {
        'Available': 0,
        'Low Stock': 0,
        'Unavailable': 0
    };
    
    inventory.forEach(item => {
        const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
        
        if (availableQty === 0) {
            statusCounts['Unavailable']++;
        } else if (availableQty <= item.threshold) {
            statusCounts['Low Stock']++;
        } else {
            statusCounts['Available']++;
        }
    });
    
    // Create chart
    const ctx = document.getElementById('inventory-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.inventoryChart) {
        window.inventoryChart.destroy();
    }
    
    window.inventoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',   // Available: green
                    'rgba(255, 206, 86, 0.7)',   // Low Stock: yellow
                    'rgba(255, 99, 132, 0.7)'    // Unavailable: red
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Inventory Status Distribution'
                },
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Generate User Activity Report
function generateUserActivityReport() {
    // Get borrow records
    const borrowRecords = getBorrowRecords();
    
    // Get users
    const users = getUsers();
    
    // Create report container
    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = `
        <h3>User Activity Report</h3>
        <div class="report-filters mb-3 d-flex">
            <div class="form-group mr-3">
                <label for="role-filter">Role:</label>
                <select id="role-filter" class="form-control">
                    <option value="all" selected>All Roles</option>
                    <option value="player">Player</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div class="form-group">
                <label for="activity-time-period">Time Period:</label>
                <select id="activity-time-period" class="form-control">
                    <option value="30" selected>Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="365">Last Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>
        </div>
        <div class="chart-container mb-4">
            <canvas id="activity-chart"></canvas>
        </div>
        <div class="table-responsive">
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Items Borrowed</th>
                        <th>Total Quantity</th>
                        <th>Active Borrows</th>
                        <th>Overdue Items</th>
                    </tr>
                </thead>
                <tbody id="activity-table-body">
                </tbody>
            </table>
        </div>
    `;
    
    // Add event listeners to filters
    document.getElementById('role-filter').addEventListener('change', updateUserActivityReport);
    document.getElementById('activity-time-period').addEventListener('change', updateUserActivityReport);
    
    // Initial report
    updateUserActivityReport();
}

// Update User Activity Report
function updateUserActivityReport() {
    // Get filters
    const roleFilter = document.getElementById('role-filter');
    const timeFilter = document.getElementById('activity-time-period');
    
    const roleValue = roleFilter.value;
    const timeValue = timeFilter.value;
    
    // Get users
    let users = getUsers();
    
    // Apply role filter
    if (roleValue !== 'all') {
        users = users.filter(user => user.role === roleValue);
    }
    
    // Get borrow records
    const borrowRecords = getBorrowRecords();
    
    // Filter records by time period
    const today = new Date();
    const startDate = new Date();
    
    if (timeValue !== 'all') {
        startDate.setDate(today.getDate() - parseInt(timeValue));
    } else {
        // Set to a very old date for "all time"
        startDate.setFullYear(2000);
    }
    
    const filteredRecords = borrowRecords.filter(record => {
        const recordDate = new Date(record.requestDate);
        return recordDate >= startDate && recordDate <= today;
    });
    
    // Calculate activity statistics by user
    const activityStats = {};
    
    // Initialize all users with zero stats
    users.forEach(user => {
        activityStats[user.id] = {
            id: user.id,
            username: user.username,
            role: user.role,
            itemsBorrowed: 0,
            totalQuantity: 0,
            activeBorrows: 0,
            overdueItems: 0
        };
    });
    
    // Accumulate stats from borrow records
    filteredRecords.forEach(record => {
        if (!activityStats[record.userId]) return;
        
        if (record.status === 'approved' || record.status === 'returned') {
            activityStats[record.userId].itemsBorrowed += 1;
            activityStats[record.userId].totalQuantity += record.quantity;
            
            // Check if it's an active borrow
            if (record.status === 'approved') {
                activityStats[record.userId].activeBorrows += 1;
                
                // Check if it's overdue
                const dueDate = new Date(record.dueDate);
                if (dueDate < today) {
                    activityStats[record.userId].overdueItems += 1;
                }
            }
        }
    });
    
    // Sort by items borrowed (descending)
    const sortedStats = Object.values(activityStats).sort((a, b) => b.itemsBorrowed - a.itemsBorrowed);
    
    // Update table
    const tableBody = document.getElementById('activity-table-body');
    tableBody.innerHTML = '';
    
    if (sortedStats.length === 0 || sortedStats.every(stat => stat.itemsBorrowed === 0)) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No activity found for the selected filters</td>
            </tr>
        `;
    } else {
        sortedStats.forEach(stat => {
            if (stat.itemsBorrowed > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${stat.username}</td>
                    <td>${stat.role}</td>
                    <td>${stat.itemsBorrowed}</td>
                    <td>${stat.totalQuantity}</td>
                    <td>${stat.activeBorrows}</td>
                    <td class="${stat.overdueItems > 0 ? 'status-unavailable' : ''}">${stat.overdueItems}</td>
                `;
                tableBody.appendChild(row);
            }
        });
    }
    
    // Prepare data for chart - show top 10 users by borrowing activity
    const chartData = sortedStats.filter(stat => stat.itemsBorrowed > 0).slice(0, 10);
    
    // Create chart
    const ctx = document.getElementById('activity-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.activityChart) {
        window.activityChart.destroy();
    }
    
    window.activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(stat => stat.username),
            datasets: [
                {
                    label: 'Items Borrowed',
                    data: chartData.map(stat => stat.itemsBorrowed),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Active Borrows',
                    data: chartData.map(stat => stat.activeBorrows),
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Overdue Items',
                    data: chartData.map(stat => stat.overdueItems),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Users'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `User Activity (${timeValue === 'all' ? 'All Time' : `Last ${timeValue} Days`})`
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Generate Low Stock Report
function generateLowStockReport() {
    // Get inventory items
    const inventory = getInventory();
    
    // Update available quantities
    inventory.forEach(item => {
        updateInventoryQuantity(item.id);
    });
    
    // Create report container
    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = `
        <h3>Low Stock Report</h3>
        <div class="chart-container mb-4">
            <canvas id="low-stock-chart"></canvas>
        </div>
        <div class="table-responsive">
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Available / Total</th>
                        <th>Threshold</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="low-stock-table-body">
                </tbody>
            </table>
        </div>
    `;
    
    // Filter for low stock items
    const lowStockItems = inventory.filter(item => {
        const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
        return availableQty <= item.threshold;
    });
    
    // Sort by available quantity (ascending)
    lowStockItems.sort((a, b) => {
        const aQty = a.availableQuantity !== undefined ? a.availableQuantity : a.quantity;
        const bQty = b.availableQuantity !== undefined ? b.availableQuantity : b.quantity;
        return aQty - bQty;
    });
    
    // Update table
    const tableBody = document.getElementById('low-stock-table-body');
    
    if (lowStockItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No low stock items found</td>
            </tr>
        `;
    } else {
        lowStockItems.forEach(item => {
            const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
            const statusClass = getStatusClass(availableQty, item.threshold);
            const statusText = getStatusText(availableQty, item.threshold);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${availableQty} / ${item.quantity}</td>
                <td>${item.threshold}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${item.location}</td>
                <td>
                    <button class="btn btn-primary btn-sm update-stock-btn" data-id="${item.id}">Update Stock</button>
                    <a href="inventory-detail.html?id=${item.id}" class="btn btn-secondary btn-sm">View Details</a>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        tableBody.querySelectorAll('.update-stock-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                updateItemStock(itemId);
            });
        });
    }
    
    // Prepare data for chart - by category
    const categoryCounts = {};
    
    lowStockItems.forEach(item => {
        if (!categoryCounts[item.category]) {
            categoryCounts[item.category] = {
                unavailable: 0,
                lowStock: 0
            };
        }
        
        const availableQty = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
        
        if (availableQty === 0) {
            categoryCounts[item.category].unavailable++;
        } else {
            categoryCounts[item.category].lowStock++;
        }
    });
    
    // Prepare arrays for chart
    const categories = Object.keys(categoryCounts);
    const unavailableCounts = categories.map(cat => categoryCounts[cat].unavailable);
    const lowStockCounts = categories.map(cat => categoryCounts[cat].lowStock);
    
    // Create chart
    const ctx = document.getElementById('low-stock-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.lowStockChart) {
        window.lowStockChart.destroy();
    }
    
    window.lowStockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: 'Low Stock',
                    data: lowStockCounts,
                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Unavailable',
                    data: unavailableCounts,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Categories'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Items'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Low Stock Items by Category'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Update item stock
function updateItemStock(itemId) {
    const item = getInventoryItem(itemId);
    if (!item) {
        showFlashMessage('Item not found', 'error');
        return;
    }
    
    // Create form content
    const formContent = document.createElement('div');
    formContent.innerHTML = `
        <form id="update-stock-form">
            <div class="form-group">
                <label for="item-name">Item</label>
                <input type="text" id="item-name" value="${item.name}" disabled>
            </div>
            <div class="form-group">
                <label for="current-quantity">Current Total Quantity</label>
                <input type="text" id="current-quantity" value="${item.quantity}" disabled>
            </div>
            <div class="form-group">
                <label for="additional-quantity">Add Quantity</label>
                <input type="number" id="additional-quantity" name="additional-quantity" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label for="update-notes">Notes</label>
                <textarea id="update-notes" name="update-notes" rows="3"></textarea>
            </div>
        </form>
    `;
    
    // Create modal with form
    const modal = createModal('Update Stock', formContent, [
        {
            text: 'Cancel',
            class: 'btn-secondary'
        },
        {
            text: 'Add Stock',
            class: 'btn-primary',
            callback: () => {
                const form = document.getElementById('update-stock-form');
                if (form.checkValidity()) {
                    const additionalQty = parseInt(document.getElementById('additional-quantity').value);
                    const notes = document.getElementById('update-notes').value;
                    
                    // Update item quantity
                    item.quantity += additionalQty;
                    if (item.availableQuantity !== undefined) {
                        item.availableQuantity += additionalQty;
                    }
                    
                    item.lastUpdated = new Date().toISOString();
                    saveInventoryItem(item);
                    
                    // Create stock update notification
                    const notification = {
                        type: 'stock_updated',
                        title: 'Stock Updated',
                        message: `Added ${additionalQty} to ${item.name}. ${notes ? 'Notes: ' + notes : ''}`,
                        itemId: item.id,
                        severity: 'info'
                    };
                    
                    addNotification(notification);
                    
                    // Show success message
                    showFlashMessage('Stock updated successfully!', 'success');
                    
                    // Refresh report
                    generateLowStockReport();
                } else {
                    form.reportValidity();
                    return false; // Prevent modal from closing
                }
            }
        }
    ]);
}

// Export report to CSV
function exportReportToCsv(reportType) {
    let data = [];
    let filename = '';
    
    switch(reportType) {
        case 'equipment-usage':
            data = generateEquipmentUsageData();
            filename = 'equipment_usage_report.csv';
            break;
        case 'overdue-items':
            data = generateOverdueItemsData();
            filename = 'overdue_items_report.csv';
            break;
        case 'inventory-status':
            data = generateInventoryStatusData();
            filename = 'inventory_status_report.csv';
            break;
        case 'user-activity':
            data = generateUserActivityData();
            filename = 'user_activity_report.csv';
            break;
        case 'low-stock':
            data = generateLowStockData();
            filename = 'low_stock_report.csv';
            break;
        default:
            showFlashMessage('Invalid report type', 'error');
            return;
    }
    
    if (data.length === 0) {
        showFlashMessage('No data to export', 'error');
        return;
    }
    
    // Convert data to CSV
    const csvContent = convertToCsv(data);
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Convert data to CSV
function convertToCsv(data) {
    if (data.length === 0) return '';
    
    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data.map(row => 
        Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
    ).join('\n');
    
    return header + rows;
}

// Add Chart.js to the page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('reports-container')) {
        // Check if Chart.js is already loaded
        if (!window.Chart) {
            // Load Chart.js from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = function() {
                // Initialize report selection after Chart.js is loaded
                initReportSelection();
                
                // Load default report
                generateEquipmentUsageReport();
            };
            document.head.appendChild(script);
        }
    }
});
