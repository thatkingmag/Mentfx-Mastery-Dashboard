/**
 * Mentfx Utils Module
 */
window.MentfxUtils = {
    showToast: function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('toast-visible'), 10);
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    },

    formatTime: function(seconds) {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    handleEmptyState: function(containerId, hasData, icon, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let emptyDiv = container.parentElement.querySelector('.empty-state-container');
        
        if (!hasData) {
            if (!emptyDiv) {
                emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state-container';
                container.parentElement.appendChild(emptyDiv);
            }
            emptyDiv.innerHTML = `<span class="empty-state-icon">${icon}</span><p>${message}</p>`;
            container.style.display = 'none';
        } else {
            if (emptyDiv) emptyDiv.remove();
            container.style.display = 'block';
        }
    }
};

// Map to global for compatibility
window.showToast = window.MentfxUtils.showToast;
window.handleEmptyState = window.MentfxUtils.handleEmptyState;
