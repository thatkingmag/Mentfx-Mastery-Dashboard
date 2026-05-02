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

        if (targetId === 'tracker') window.MentfxTracker?.renderCurrentView();
        if (targetId === 'dashboard') window.updateDashboard?.();
        if (targetId === 'mastery') window.MentfxMastery?.renderMastery();
        if (targetId === 'application') this.renderApplication();
    },

    renderApplication: function() {
        const S = window.MentfxState;
        const container = document.getElementById('app-grid');
        if (!container) return;
        
        container.innerHTML = '';
        S.appApplicationData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'webinar-card glass';
            const isDone = item.status === 'Completed';
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-month">${item.category || 'General'}</span>
                    <span class="status-badge status-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span>
                </div>
                <div class="card-title">${item.name}</div>
                <div class="card-footer">
                    <button class="btn-quick-done ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${item.id}', 'application', event)">${isDone ? '✓' : ''}</button>
                    <button class="btn-action" onclick="openEditModal('${item.id}', 'application')">Edit</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    openProfileModal: function() {
        if (window.closeSidebar) window.closeSidebar();
        
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.getElementById('profile-name-input').value = window.MentfxState.userProfile.name;
            document.getElementById('profile-motto-input').value = window.MentfxState.userProfile.motto || '';
            
            // Sync preview image on open
            const preview = document.getElementById('profile-avatar-preview');
            const profile = window.MentfxState.userProfile;
            const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase();
            if (preview) {
                if (profile.avatarUrl) {
                    preview.style.backgroundImage = `url(${profile.avatarUrl})`;
                    preview.textContent = '';
                } else {
                    preview.style.backgroundImage = 'none';
                    preview.textContent = initials;
                }
            }
        }
    },

    closeProfileModal: function() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    },

    saveProfile: function() {
        const name = document.getElementById('profile-name-input').value;
        const motto = document.getElementById('profile-motto-input').value;
        window.MentfxState.userProfile.name = name;
        window.MentfxState.userProfile.motto = motto;
        window.MentfxState.saveLocalData();
        window.MentfxUI.updateProfileUI();
        window.MentfxUI.closeProfileModal();
        window.showToast('Profile updated!', 'success');
    },

    updateProfileUI: function() {
        const profile = window.MentfxState.userProfile;
        const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        const avatarElements = [
            document.getElementById('display-avatar'),
            document.getElementById('sidebar-avatar'),
            document.getElementById('profile-avatar-preview')
        ];
        
        avatarElements.forEach(el => {
            if (el) {
                if (profile.avatarUrl) {
                    el.style.backgroundImage = `url("${profile.avatarUrl}")`;
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center';
                    el.style.backgroundRepeat = 'no-repeat';
                    el.textContent = '';
                } else {
                    el.style.backgroundImage = 'none';
                    el.style.background = 'linear-gradient(135deg, var(--primary), var(--accent))';
                    el.textContent = initials;
                }
            }
        });
        
        const nameEl = document.getElementById('display-name');
        if (nameEl) nameEl.textContent = profile.name;
        
        const sidebarName = document.getElementById('sidebar-name');
        if (sidebarName) sidebarName.textContent = profile.name;
    },

    handleProfilePicUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            window.MentfxState.userProfile.avatarUrl = e.target.result;
            window.MentfxUI.updateProfileUI(); // Immediately show preview
        };
        reader.readAsDataURL(file);
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
    },

    toggleSidebar: function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    },

    closeSidebar: function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
};

// Global Mappings
window.showTab = window.MentfxUI.showTab;
window.toggleSidebar = window.MentfxUI.toggleSidebar;
window.closeSidebar = window.MentfxUI.closeSidebar;
window.openProfileModal = window.MentfxUI.openProfileModal;
window.closeProfileModal = window.MentfxUI.closeProfileModal;
window.saveProfile = window.MentfxUI.saveProfile;
window.renderApplication = window.MentfxUI.renderApplication;
window.handleProfilePicUpload = window.MentfxUI.handleProfilePicUpload;
