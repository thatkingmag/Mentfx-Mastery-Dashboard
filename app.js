/**
 * Mentfx Dashboard - Main Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State & Data
    const S = window.MentfxState;
    const U = window.MentfxUtils;
    const UI = window.MentfxUI;
    const T = window.MentfxTracker;
    const M = window.MentfxMastery;
    const A = window.MentfxAdmin;

    function init() {
        // Load data from LocalStorage
        const savedWebinars = localStorage.getItem('mentfxData');
        if (savedWebinars) S.appData = JSON.parse(savedWebinars);
        else if (typeof window.webinarData !== 'undefined') S.appData = [...window.webinarData];

        const savedApp = localStorage.getItem('mentfxApplication');
        if (savedApp) S.appApplicationData = JSON.parse(savedApp);
        else if (typeof window.applicationData !== 'undefined') S.appApplicationData = [...window.applicationData];

        const savedMastery = localStorage.getItem('mentfxMastery');
        if (savedMastery) S.masteryProgress = JSON.parse(savedMastery);

        const savedLog = localStorage.getItem('mentfxActivityLog');
        if (savedLog) S.activityLog = JSON.parse(savedLog);

        const savedProfile = localStorage.getItem('mentfxProfile');
        if (savedProfile) S.userProfile = JSON.parse(savedProfile);

        // Initial Renders
        UI.showTab('dashboard');
        UI.updateClock();
        setInterval(UI.updateClock, 1000);

        // Sync with server if local and on the correct port (8000)
        if (window.location.port === '8000') {
            loadFromServer();
        } else {
            console.log('Running on secondary local port (5500). Server sync disabled to prevent 404s.');
        }

        setupEventListeners();
        console.log('Mentfx Dashboard Initialized');
    }

    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.nav-links li, .clickable-logo').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab || 'dashboard';
                UI.showTab(targetId);
            });
        });

        // View Toggling
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                S.currentViewMode = btn.dataset.mode;
                T.renderCurrentView();
            });
        });

        // Global Search
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (query.length > 0) handleGlobalSearch(query);
                else UI.showTab('dashboard');
            });
        }

        // Mobile Sidebar Toggles
        const hb = document.getElementById('hamburger-btn');
        if (hb) hb.addEventListener('click', () => UI.toggleSidebar());

        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.addEventListener('click', () => UI.closeSidebar());

        // Close sidebar on tab click (mobile)
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', () => UI.closeSidebar());
        });
    }

    async function loadFromServer() {
        try {
            const resp = await fetch('/api/load');
            if (resp.ok) {
                const data = await resp.json();
                if (data.webinars) S.appData = data.webinars;
                if (data.mastery) S.masteryProgress = data.mastery;
                if (data.profile) S.userProfile = data.profile;
                if (data.application) S.appApplicationData = data.application;
                
                S.saveLocalData();
                T.renderCurrentView();
                M.renderMastery();
                window.updateDashboard?.();
            }
        } catch (e) {
            console.warn('Local server not available');
        }
    }

    // Expose core functions to window for onclick compatibility
    window.toggleItemComplete = (id, category, event) => {
        if (event) event.stopPropagation();
        // Logic for toggling status and saving
        const S = window.MentfxState;
        let item;
        if (category === 'webinar') item = S.appData.find(w => w.id === id);
        else if (category === 'mastery') item = S.masteryProgress[id] || { status: 'Not Started' };
        
        const isDone = item.status === 'Completed';
        const newStatus = isDone ? 'Not Started' : 'Completed';
        
        if (category === 'webinar') item.status = newStatus;
        else S.masteryProgress[id] = { ...item, status: newStatus };
        
        S.saveLocalData();
        T.renderCurrentView();
        M.renderMastery();
        U.showToast(`${category.charAt(0).toUpperCase() + category.slice(1)} status updated`, 'success');
        window.updateDashboard?.();
    };

    window.openEditModal = (id, type) => {
        // ... abbreviated modal logic ...
    };

    init();
});
