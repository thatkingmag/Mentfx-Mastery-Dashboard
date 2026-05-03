/**
 * Mentfx Dashboard Module - Handles the Overview/Dashboard tab logic
 */
window.MentfxDashboard = {
    init: function() {
        console.log('Initializing Dashboard Logic...');
        console.log('Webinars:', window.MentfxState.appData.length);
        console.log('Mastery:', (window.masteryData || []).length);
        this.updateStats();
        this.renderCharts();
        this.renderHeatmap();
        this.renderNextUp();
    },

    updateStats: function() {
        const S = window.MentfxState;
        
        // 1. Mastery Stats
        const masteryLessons = (window.masteryData || []).flatMap(m => m.lessons);
        const totalMastery = masteryLessons.length;
        const completedMastery = masteryLessons.filter(l => S.masteryProgress[l.id]?.status === 'Completed').length;
        const masteryPct = totalMastery ? Math.round((completedMastery / totalMastery) * 100) : 0;
        
        U.updateText('mastery-progress-pct', masteryPct + '%');
        U.updateWidth('mastery-progress-fill', masteryPct + '%');
        U.updateText('mastery-watched-count', `${completedMastery} / ${totalMastery} Lessons`);
        
        // 2. Webinar Stats
        const totalWebinars = S.appData.length;
        const completedWebinars = S.appData.filter(w => w.status === 'Completed').length;
        const inProgressWebinars = S.appData.filter(w => w.status === 'In Progress').length;
        const webinarPct = totalWebinars ? Math.round((completedWebinars / totalWebinars) * 100) : 0;
        
        U.updateText('overall-progress', webinarPct + '%');
        U.updateWidth('progress-fill', webinarPct + '%');
        U.updateText('watched-count', `${completedWebinars} / ${totalWebinars} Watched`);
        U.updateText('in-progress-count', inProgressWebinars);
        
        // 3. Application Stats
        const totalApp = S.appApplicationData.length;
        const completedApp = S.appApplicationData.filter(a => a.status === 'Completed').length;
        const appPct = totalApp ? Math.round((completedApp / totalApp) * 100) : 0;
        
        U.updateText('app-progress-pct', appPct + '%');
        U.updateWidth('app-progress-fill', appPct + '%');
        U.updateText('app-watched-count', `${completedApp} / ${totalApp} Completed`);

        // 4. Mini Sidebar Stats
        U.updateText('mini-mastery-txt', masteryPct + '%');
        U.updateWidth('mini-mastery-fill', masteryPct + '%');
        U.updateText('mini-progress-txt', webinarPct + '%');
        U.updateWidth('mini-progress-fill', webinarPct + '%');
        U.updateText('mini-app-txt', appPct + '%');
        U.updateWidth('mini-app-fill', appPct + '%');
        
        // 5. Active Items
        const activeWebinar = S.appData.find(w => w.status === 'In Progress') || S.appData.find(w => w.status === 'Not Started');
        if (activeWebinar) {
            U.updateText('active-webinar-title', activeWebinar.name);
            U.updateText('active-webinar-month', activeWebinar.monthGroup);
        }
        
        const activeMastery = masteryLessons.find(l => S.masteryProgress[l.id]?.status === 'In Progress') || masteryLessons.find(l => S.masteryProgress[l.id]?.status === 'Not Started');
        if (activeMastery) {
            U.updateText('active-module-title', activeMastery.name);
        }

        // 7. Latest Application Concept
        const latestApp = S.appApplicationData.find(a => a.status === 'In Progress') || S.appApplicationData.find(a => a.status === 'Completed');
        if (latestApp) {
            U.updateText('latest-app-concept', latestApp.name);
        }

        // 8. Setup card listeners (one-time)
        if (!this.listenersSet) {
            const cards = [
                { id: 'webinar-progress-card', tab: 'tracker' },
                { id: 'active-webinar-card', tab: 'tracker' },
                { id: 'in-progress-card', tab: 'tracker' },
                { id: 'app-progress-card', tab: 'application' }
            ];
            cards.forEach(c => {
                const el = document.getElementById(c.id);
                if (el) el.onclick = () => window.showTab(c.tab);
            });
            this.listenersSet = true;
        }

        // 6. Streak (moved down)
        this.updateStreak();
    },

    updateStreak: function() {
        const S = window.MentfxState;
        // Simple streak logic based on activityLog (dates)
        const activityDates = new Set(S.activityLog.map(log => log.date.split('T')[0]));
        const today = new Date().toISOString().split('T')[0];
        
        let currentStreak = 0;
        let tempDate = new Date();
        while (activityDates.has(tempDate.toISOString().split('T')[0])) {
            currentStreak++;
            tempDate.setDate(tempDate.getDate() - 1);
        }
        
        U.updateText('streak-current', currentStreak);
        U.updateText('streak-days', activityDates.size);
        // Best streak would need more complex logic, for now just use current or saved
        const best = Math.max(currentStreak, parseInt(localStorage.getItem('mentfxBestStreak') || 0));
        localStorage.setItem('mentfxBestStreak', best);
        U.updateText('streak-best', best);
        
        const msgEl = document.getElementById('streak-msg');
        if (msgEl) {
            if (currentStreak > 0) msgEl.textContent = `You're on fire! Keep it up!`;
            else msgEl.textContent = `Start studying to build your streak!`;
        }
    },

    renderCharts: function() {
        const S = window.MentfxState;
        
        // Monthly Completion Chart
        const monthlyCtx = document.getElementById('monthlyChart')?.getContext('2d');
        if (monthlyCtx) {
            if (S.monthlyChartInstance) S.monthlyChartInstance.destroy();
            
            const monthCounts = {};
            S.appData.filter(w => w.status === 'Completed').forEach(w => {
                monthCounts[w.monthGroup] = (monthCounts[w.monthGroup] || 0) + 1;
            });
            
            const labels = Object.keys(monthCounts);
            const data = Object.values(monthCounts);
            
            S.monthlyChartInstance = new Chart(monthlyCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Webinars Completed',
                        data: data,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Status Pie Chart
        const pieCtx = document.getElementById('statusPieChart')?.getContext('2d');
        if (pieCtx) {
            if (S.pieChartInstance) S.pieChartInstance.destroy();
            const counts = {
                'Completed': S.appData.filter(w => w.status === 'Completed').length,
                'In Progress': S.appData.filter(w => w.status === 'In Progress').length,
                'Not Started': S.appData.filter(w => w.status === 'Not Started').length
            };
            
            S.pieChartInstance = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'In Progress', 'Not Started'],
                    datasets: [{
                        data: [counts.Completed, counts['In Progress'], counts['Not Started']],
                        backgroundColor: ['#10b981', '#3b82f6', '#94a3b8'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // Sidebar Pie Chart
        const sidePieCtx = document.getElementById('sidebarPieChart')?.getContext('2d');
        if (sidePieCtx) {
            if (S.sidebarPieChartInstance) S.sidebarPieChartInstance.destroy();
            const completed = S.appData.filter(w => w.status === 'Completed').length;
            const remaining = S.appData.length - completed;
            
            S.sidebarPieChartInstance = new Chart(sidePieCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [completed, remaining],
                        backgroundColor: ['#3b82f6', 'rgba(255,255,255,0.05)'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '80%',
                    plugins: { legend: { display: false } }
                }
            });
        }
        
        // Trend Chart
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            if (S.trendChartInstance) S.trendChartInstance.destroy();
            // Mock trend data or calculate from activity log
            const data = S.appData.filter(w => w.status === 'Completed' && w.rating > 0).slice(-10);
            
            S.trendChartInstance = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: data.map(w => w.name),
                    datasets: [{
                        label: 'Understanding Rating',
                        data: data.map(w => w.rating),
                        borderColor: '#10b981',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { min: 0, max: 5, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { display: false }
                    }
                }
            });
        }
    },

    renderHeatmap: function() {
        const container = document.getElementById('heatmap-grid');
        if (!container) return;
        container.innerHTML = '';
        
        const S = window.MentfxState;
        const activityDates = {};
        S.activityLog.forEach(log => {
            const d = log.date.split('T')[0];
            activityDates[d] = (activityDates[d] || 0) + 1;
        });

        // Render last 365 days
        const now = new Date();
        for (let i = 364; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const count = activityDates[ds] || 0;
            const level = Math.min(count, 4);
            
            const box = document.createElement('div');
            box.className = `heatmap-box level-${level}`;
            box.title = `${ds}: ${count} activities`;
            container.appendChild(box);
        }
    },

    renderNextUp: function() {
        const S = window.MentfxState;
        const container = document.getElementById('next-up-grid');
        if (!container) return;
        container.innerHTML = '';
        
        // Find next webinar and next mastery lesson
        const nextWebinar = S.appData.find(w => w.status === 'Not Started');
        const masteryLessons = (window.masteryData || []).flatMap(m => m.lessons);
        const nextMastery = masteryLessons.find(l => S.masteryProgress[l.id]?.status !== 'Completed');
        
        [
            { item: nextWebinar, type: 'Next Webinar', color: 'var(--primary)', tab: 'tracker' },
            { item: nextMastery, type: 'Next Mastery Lesson', color: 'var(--accent)', tab: 'mastery' }
        ].forEach(target => {
            if (!target.item) return;
            const card = document.createElement('div');
            card.className = 'next-up-card glass';
            
            const watchBtn = target.item.link 
                ? `<a href="${target.item.link}" target="_blank" class="btn-watch-now" style="background:${target.color}" onclick="event.stopPropagation()">Watch Now</a>`
                : `<button class="btn-watch-now" style="background:${target.color}" onclick="window.showTab('${target.tab}')">View Details</button>`;

            card.innerHTML = `
                <div class="next-up-content" onclick="window.showTab('${target.tab}')">
                    <div class="next-up-type" style="color:${target.color}">${target.type}</div>
                    <div class="next-up-title">${target.item.name}</div>
                    <div class="next-up-subtitle">${target.item.monthGroup || ''}</div>
                </div>
                <div class="next-up-actions">
                    ${watchBtn}
                </div>
            `;
            container.appendChild(card);
        });
    }
};

// Internal Helpers
const U = {
    updateText: (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    },
    updateWidth: (id, w) => {
        const el = document.getElementById(id);
        if (el) el.style.width = w;
    }
};

window.updateDashboard = () => window.MentfxDashboard.init();
