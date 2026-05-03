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
                            <div class="lesson-item ${isDone ? 'completed' : ''}">
                                <div class="lesson-info" onclick="openEditModal('${lesson.id}', 'mastery')">
                                    <span>${lesson.name}</span>
                                </div>
                                <div class="lesson-actions">
                                    ${lesson.link ? `<a href="${lesson.link}" target="_blank" class="btn-watch-mini" title="Watch Now">
                                        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </a>` : ''}
                                    <button class="btn-quick-done ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${lesson.id}', 'mastery', event)">${isDone ? '✓' : ''}</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            grid.appendChild(card);
        });
    },

    renderMasteryList: function() {
        const S = window.MentfxState;
        const body = document.getElementById('mastery-list-body');
        if (!body) return;
        
        body.innerHTML = '';
        masteryData.forEach(mod => {
            mod.lessons.forEach(lesson => {
                const prog = S.masteryProgress[lesson.id] || { status: 'Not Started' };
                const isDone = prog.status === 'Completed';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <button class="btn-quick-done ${isDone ? 'done' : ''}" onclick="toggleItemComplete('${lesson.id}', 'mastery', event)">${isDone ? '✓' : ''}</button>
                    </td>
                    <td>
                        <div class="lesson-list-name" onclick="openEditModal('${lesson.id}', 'mastery')" style="cursor:pointer">
                            <div style="font-size:0.7rem; opacity:0.6;">Module ${mod.module}</div>
                            <div style="font-weight:500;">${lesson.name}</div>
                        </div>
                    </td>
                    <td style="text-align:right">
                        ${lesson.link ? `<a href="${lesson.link}" target="_blank" class="btn-action">Watch</a>` : ''}
                        <button class="btn-action" onclick="openEditModal('${lesson.id}', 'mastery')">Update</button>
                    </td>
                `;
                body.appendChild(row);
            });
        });
    }
};

window.renderMastery = () => window.MentfxMastery.renderMastery();
