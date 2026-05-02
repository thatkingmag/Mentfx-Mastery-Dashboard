/**
 * Mentfx Mastery Module
 */
window.MentfxMastery = {
    renderMastery: function() {
        const mode = window.MentfxState.currentMasteryViewMode;
        if (mode === 'grid') this.renderMasteryGrid();
        else this.renderMasteryList();
    },

    renderMasteryGrid: function() {
        const S = window.MentfxState;
        const grid = document.getElementById('mastery-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        masteryData.forEach(mod => {
            const total = mod.lessons.length;
            const completed = mod.lessons.filter(l => S.masteryProgress[l.id]?.status === 'Completed').length;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            const isFullyDone = pct === 100;

            const card = document.createElement('div');
            card.className = `module-card ${window.MentfxState.collapsedModules.has(mod.module) ? 'collapsed' : ''}`;
            
            card.innerHTML = `
                <div class="module-card-header" onclick="toggleModule(${mod.module})">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span class="module-progress-chip">${pct}%</span>
                        <h3>Module ${mod.module}: ${mod.title}</h3>
                        ${isFullyDone ? '<span class="module-done-badge">✓ Completed</span>' : ''}
                    </div>
                </div>
                <div class="lesson-list">
                    ${mod.lessons.map(lesson => {
                        const prog = S.masteryProgress[lesson.id] || { status: 'Not Started' };
                        const isDone = prog.status === 'Completed';
                        return `
                            <div class="lesson-item ${isDone ? 'completed' : ''}" onclick="openEditModal('${lesson.id}', 'mastery')">
                                <span>${lesson.name}</span>
                                <button class="btn-quick-done ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${lesson.id}', 'mastery', event)">${isDone ? '✓' : ''}</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            grid.appendChild(card);
        });
    },

    renderMasteryList: function() {
        // ... list view logic ...
    }
};

window.renderMastery = () => window.MentfxMastery.renderMastery();
