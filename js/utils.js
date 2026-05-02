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
    },

    exportProgress: function() {
        const data = {
            masteryProgress: window.MentfxState.masteryProgress,
            appData: window.MentfxState.appData,
            appApplicationData: window.MentfxState.appApplicationData,
            activityLog: window.MentfxState.activityLog,
            userProfile: window.MentfxState.userProfile
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mentfx_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.MentfxUtils.showToast('Data exported successfully!', 'success');
    },

    importProgress: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.masteryProgress) window.MentfxState.masteryProgress = data.masteryProgress;
                if (data.appData) window.MentfxState.appData = data.appData;
                if (data.appApplicationData) window.MentfxState.appApplicationData = data.appApplicationData;
                if (data.activityLog) window.MentfxState.activityLog = data.activityLog;
                if (data.userProfile) window.MentfxState.userProfile = data.userProfile;
                
                window.MentfxState.saveLocalData();
                window.MentfxUtils.showToast('Data imported successfully!', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (err) {
                window.MentfxUtils.showToast('Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
    }
};

// Map to global for compatibility
window.showToast = window.MentfxUtils.showToast;
window.handleEmptyState = window.MentfxUtils.handleEmptyState;
window.exportProgress = window.MentfxUtils.exportProgress;
window.importProgress = window.MentfxUtils.importProgress;

