/**
 * Mentfx Gamification Module
 * Handles Ranks, Achievements, and Celebrations
 */
window.MentfxGamification = {
    badges: [
        { id: 'first_step', name: 'First Step', icon: '🌱', desc: 'Complete your first lesson', check: (S) => S.activityLog.length > 0 },
        { id: 'streak_3', name: 'Consistent', icon: '🔥', desc: 'Reach a 3-day study streak', check: (S) => (parseInt(document.getElementById('streak-current')?.textContent) || 0) >= 3 },
        { id: 'mastery_25', name: 'Quarter Master', icon: '🥉', desc: '25% Mastery Course completion', check: (S) => window.MentfxUtils.calculateMasteryPct() >= 25 },
        { id: 'mastery_50', name: 'Halfway There', icon: '🥈', desc: '50% Mastery Course completion', check: (S) => window.MentfxUtils.calculateMasteryPct() >= 50 },
        { id: 'mastery_100', name: 'The Graduate', icon: '🎓', desc: '100% Mastery Course completion', check: (S) => window.MentfxUtils.calculateMasteryPct() >= 100 },
        { id: 'high_focus', name: 'Deep Diver', icon: '🧬', desc: 'Rate 5 lessons with 5/5 understanding', check: (S) => {
            const count = Object.values(S.masteryProgress).filter(p => p.understanding === 5).length + 
                          S.appData.filter(w => w.understanding === 5).length;
            return count >= 5;
        }}
    ],

    getRanks: function(pct) {
        if (pct >= 90) return { title: 'Mastery Trader', class: 'rank-mastery', desc: 'You have mastered the core principles.' };
        if (pct >= 60) return { title: 'Specialist', class: 'rank-specialist', desc: 'Deep understanding of market mechanics.' };
        if (pct >= 25) return { title: 'Analyst', class: 'rank-analyst', desc: 'Applying theory to chart data.' };
        return { title: 'Novice', class: 'rank-novice', desc: 'Beginning the journey of mastery.' };
    },

    updateRank: function() {
        const pct = window.MentfxUtils.calculateMasteryPct();
        const rank = this.getRanks(pct);
        
        const badge = document.getElementById('user-rank-badge');
        const desc = document.getElementById('rank-description');
        
        if (badge) {
            badge.textContent = rank.title;
            badge.className = 'rank-badge ' + rank.class;
        }
        if (desc) desc.textContent = rank.desc;
    },

    updateBadges: function() {
        const S = window.MentfxState;
        const container = document.getElementById('achievement-badges');
        if (!container) return;

        container.innerHTML = '';
        this.badges.forEach(badge => {
            const isUnlocked = badge.check(S);
            const div = document.createElement('div');
            div.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
            div.innerHTML = `
                <span>${badge.icon}</span>
                <div class="badge-tooltip"><strong>${badge.name}</strong><br>${badge.desc}</div>
            `;
            container.appendChild(div);
        });
    },

    updateLiveAccent: function(color) {
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--accent', color);
        // Also update primary-hover with a darker version if possible, or just same
        localStorage.setItem('mentfxAccentColor', color);
    },

    resetTheme: function() {
        const defaultColor = '#10b981';
        this.updateLiveAccent(defaultColor);
        const picker = document.getElementById('admin-accent-color');
        if (picker) picker.value = defaultColor;
    },

    init: function() {
        const savedColor = localStorage.getItem('mentfxAccentColor');
        if (savedColor) {
            this.updateLiveAccent(savedColor);
            const picker = document.getElementById('admin-accent-color');
            if (picker) picker.value = savedColor;
        }
        this.updateRank();
        this.updateBadges();
    }
};

// Global mappings
window.updateLiveAccent = (val) => window.MentfxGamification.updateLiveAccent(val);
window.resetTheme = () => window.MentfxGamification.resetTheme();
