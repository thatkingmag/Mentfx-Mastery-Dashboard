/**
 * Mentfx Admin Module
 */
window.MentfxAdmin = {
    saveToServer: async function() {
        if (window.location.port !== '8000') return;
        const S = window.MentfxState;
        const data = {
            webinars: S.appData,
            mastery: S.masteryProgress,
            profile: S.userProfile,
            application: S.appApplicationData
        };
        
        try {
            const resp = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (resp.ok) window.showToast('Data synced to local server', 'success');
        } catch (e) {
            console.warn('Local server not available for sync');
        }
    },

    pushToGitHub: async function() {
        window.showToast('Initiating GitHub Sync...', 'info');
        // logic for triggering the local bat or server-side git push
    }
};

window.saveToServer = window.MentfxAdmin.saveToServer;
