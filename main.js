// Main JavaScript file for shared functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile menu functionality
    initializeMobileMenu();
    
    // Update notification badge
    updateNotificationBadge();
    
    // Set up logout button
    setupLogoutButton();
    
    // Set up user role-based access control
    setupRoleBasedAccess();
});

// Initialize mobile menu toggle functionality
function initializeMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navbarNav = document.querySelector('.navbar-nav');
    
    if (menuToggle && navbarNav) {
        menuToggle.addEventListener('click', function() {
            navbarNav.classList.toggle('active');
        });
    }
    
    // Handle dropdown menus on mobile
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
        
        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });
}

// Update notification badge count
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

// Set up logout button functionality
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Set up role-based access control
function setupRoleBasedAccess() {
    const currentUser = getCurrentUser();
    
    if (!currentUser) return;
    
    // Show username in the navbar
    const usernameElement = document.getElementById('current-username');
    if (usernameElement) {
        usernameElement.textContent = currentUser.username;
    }
    
    // Show/hide elements based on user role
    const adminElements = document.querySelectorAll('.admin-only');
    const coachElements = document.querySelectorAll('.coach-only');
    const playerElements = document.querySelectorAll('.player-only');
    
    adminElements.forEach(el => {
        el.style.display = currentUser.role === 'admin' ? '' : 'none';
    });
    
    coachElements.forEach(el => {
        el.style.display = (currentUser.role === 'admin' || currentUser.role === 'coach') ? '' : 'none';
    });
    
    playerElements.forEach(el => {
        el.style.display = (currentUser.role === 'player') ? '' : 'none';
    });
}

// Helper function to create flash messages
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

// Helper function to format dates to locale string
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Helper function to format timestamps to locale string with time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Get URL parameter by name
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Check if element is visible in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Create a simple debounce function for search inputs
function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Create a simple modal
function createModal(title, content, buttons = []) {
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    `;
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    `;
    
    // Create title
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = title;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
    `;
    closeButton.addEventListener('click', () => modalContainer.remove());
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.style.marginBottom = '20px';
    
    if (typeof content === 'string') {
        modalBody.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        modalBody.appendChild(content);
    }
    
    // Create modal footer with buttons
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    modalFooter.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    `;
    
    // Add buttons to footer
    buttons.forEach(buttonConfig => {
        const button = document.createElement('button');
        button.textContent = buttonConfig.text;
        button.className = `btn ${buttonConfig.class || 'btn-primary'}`;
        button.addEventListener('click', () => {
            if (buttonConfig.callback) {
                buttonConfig.callback();
            }
            modalContainer.remove();
        });
        modalFooter.appendChild(button);
    });
    
    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalContainer.appendChild(modalContent);
    
    // Add modal to document
    document.body.appendChild(modalContainer);
    
    // Return modal container element for further manipulation if needed
    return modalContainer;
}

// Create loader spinner
function createLoader() {
    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'spinner-container';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    spinnerContainer.appendChild(spinner);
    document.body.appendChild(spinnerContainer);
    
    return spinnerContainer;
}

// Remove loader
function removeLoader(loader) {
    if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
    }
}

// Get status class based on quantity and threshold
function getStatusClass(quantity, threshold) {
    if (quantity === 0) {
        return 'status-unavailable';
    } else if (quantity <= threshold) {
        return 'status-low';
    } else {
        return 'status-available';
    }
}

// Get status text based on quantity and threshold
function getStatusText(quantity, threshold) {
    if (quantity === 0) {
        return 'Unavailable';
    } else if (quantity <= threshold) {
        return 'Low Stock';
    } else {
        return 'Available';
    }
}
