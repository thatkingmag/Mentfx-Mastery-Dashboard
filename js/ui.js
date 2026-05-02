/**
 * Mentfx UI Module
 */
window.MentfxUI = {
    showTab: function(targetId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links li').forEach(t => t.classList.remove('active'));
        
        const activeTab = document.querySelector(`.nav-links li[data-tab="${targetId}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        const view = document.getElementById(`${targetId}-view`);
        if (view) {
            view.classList.add('active');
            document.querySelector('.main-content').scrollTop = 0;
        }

        // Trigger specific renders
        if (targetId === 'tracker') window.MentfxTracker?.renderCurrentView();
        if (targetId === 'dashboard') window.updateDashboard?.();
        if (targetId === 'mastery') window.MentfxMastery?.renderMastery();
    },

    updateClock: function() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const fullStr = `${dateStr} | ${timeStr}`;
        
        ['dashboard-clock', 'tracker-clock'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fullStr;
        });
    }
};

window.showTab = window.MentfxUI.showTab;
