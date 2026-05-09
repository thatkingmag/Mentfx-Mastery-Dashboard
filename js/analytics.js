/**
 * Mentfx Analytics Module
 * Handles Study Timer, Projected Completion, and Topic Focus
 */
window.MentfxAnalytics = {
    timer: {
        startTime: null,
        elapsed: 0, // seconds
        interval: null,
        isRunning: false
    },

    toggleStudyTimer: function() {
        if (this.timer.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    },

    startTimer: function() {
        this.timer.startTime = Date.now() - (this.timer.elapsed * 1000);
        this.timer.isRunning = true;
        
        const btn = document.getElementById('btn-toggle-timer');
        if (btn) {
            btn.textContent = 'Stop Session';
            btn.classList.replace('btn-primary', 'btn-outline');
        }

        this.timer.interval = setInterval(() => {
            this.timer.elapsed = Math.floor((Date.now() - this.timer.startTime) / 1000);
            this.updateTimerDisplay();
        }, 1000);

        window.showToast('Study session started!', 'info');
    },

    stopTimer: function() {
        clearInterval(this.timer.interval);
        this.timer.isRunning = false;

        const btn = document.getElementById('btn-toggle-timer');
        if (btn) {
            btn.textContent = 'Start Session';
            btn.classList.replace('btn-outline', 'btn-primary');
        }

        // Log session to activity
        if (this.timer.elapsed > 60) { // Only log if > 1 minute
            window.logActivity('study_session', 'session', `Study Session: ${Math.round(this.timer.elapsed / 60)} mins`);
            window.showToast(`Session ended. Logged ${Math.round(this.timer.elapsed / 60)} minutes.`, 'success');
        }

        this.timer.elapsed = 0;
        this.updateTimerDisplay();
    },

    updateTimerDisplay: function() {
        const display = document.getElementById('study-timer-display');
        if (!display) return;

        const hrs = Math.floor(this.timer.elapsed / 3600);
        const mins = Math.floor((this.timer.elapsed % 3600) / 60);
        const secs = this.timer.elapsed % 60;

        display.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    calculateProjection: function() {
        const S = window.MentfxState;
        const totalLessons = (window.masteryData || []).reduce((acc, mod) => acc + mod.lessons.length, 0);
        const completedLessons = Object.values(S.masteryProgress).filter(p => p.status === 'Completed').length;
        const remaining = totalLessons - completedLessons;

        if (remaining <= 0) {
            this.updateProjectionUI('Completed!', 'You have finished the course.');
            return;
        }

        // Calculate rate (lessons per day in the last 14 days)
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        
        const recentCompletions = S.activityLog.filter(log => {
            const d = new Date(log.date);
            return d >= twoWeeksAgo && (log.type === 'mastery' || log.type === 'webinar');
        }).length;

        const lessonsPerDay = recentCompletions / 14;
        
        if (lessonsPerDay <= 0) {
            this.updateProjectionUI('-- --- ----', 'Study more to estimate completion.');
            return;
        }

        const daysToFinish = Math.ceil(remaining / lessonsPerDay);
        const projectedDate = new Date(now.getTime() + (daysToFinish * 24 * 60 * 60 * 1000));
        
        const dateStr = projectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        this.updateProjectionUI(dateStr, `${daysToFinish} days left at your current pace.`);
    },

    updateProjectionUI: function(date, desc) {
        const dateEl = document.getElementById('projected-date');
        const descEl = document.getElementById('projected-days-left');
        if (dateEl) dateEl.textContent = date;
        if (descEl) descEl.textContent = desc;
    },

    renderFocusTopics: function() {
        const S = window.MentfxState;
        const container = document.getElementById('focus-topics-container');
        if (!container) return;

        const tagStats = {};
        S.appData.forEach(w => {
            if (!w.tags) return;
            w.tags.forEach(tag => {
                if (!tagStats[tag]) tagStats[tag] = { count: 0, ratingSum: 0, completed: 0 };
                tagStats[tag].count++;
                if (w.status === 'Completed') {
                    tagStats[tag].completed++;
                    tagStats[tag].ratingSum += (w.rating || 0);
                }
            });
        });

        const topics = Object.entries(tagStats).map(([tag, stats]) => {
            const avgRating = stats.completed > 0 ? stats.ratingSum / stats.completed : 0;
            return { tag, avgRating, completed: stats.completed, total: stats.count };
        });

        // Sort: Priority to high volume but low understanding
        topics.sort((a, b) => {
            if (a.avgRating === 0) return 1;
            if (b.avgRating === 0) return -1;
            return a.avgRating - b.avgRating;
        });

        container.innerHTML = '';
        topics.slice(0, 15).forEach(topic => {
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            
            // Color logic: Red if low understanding, Green if high
            let colorClass = '';
            if (topic.avgRating > 0 && topic.avgRating < 3.5) {
                badge.style.background = 'rgba(239, 68, 68, 0.2)';
                badge.style.color = '#f87171';
                badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            } else if (topic.avgRating >= 4.5) {
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = '#34d399';
                badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            }

            badge.innerHTML = `${topic.tag} ${topic.avgRating > 0 ? `(${topic.avgRating.toFixed(1)})` : ''}`;
            badge.title = `${topic.completed}/${topic.total} completed. Avg understanding: ${topic.avgRating.toFixed(1)}/5`;
            container.appendChild(badge);
        });

        if (topics.length === 0) {
            container.innerHTML = '<p style="font-size:0.8rem; opacity:0.5;">No tags found. Add tags to your webinars to see focus areas.</p>';
        }
    },

    init: function() {
        this.calculateProjection();
        this.renderFocusTopics();
    }
};

// Global mappings
window.toggleStudyTimer = () => window.MentfxAnalytics.toggleStudyTimer();
