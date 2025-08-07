// Clear authentication data from localStorage
// Run this in the browser console to clear stale authentication data

console.log('Clearing authentication data...');

// Clear all authentication-related items
localStorage.removeItem('accessToken');
localStorage.removeItem('easyHMS_loggedIn');
localStorage.removeItem('easyHMS_userRole');

// Clear session storage
sessionStorage.clear();

console.log('Authentication data cleared successfully!');
console.log('Please refresh the page to see the login page.');

// Optional: Refresh the page automatically
// window.location.reload();
