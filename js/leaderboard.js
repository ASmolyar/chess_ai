/**
 * Leaderboard Module
 * Handles displaying and interacting with the public eval leaderboard
 */

const EVAL_SERVER_URL = 'http://localhost:3001';

class Leaderboard {
    constructor() {
        this.evals = [];
        this.sortBy = 'elo';
        this.sortOrder = 'desc';
        this.selectedEval = null;
        this.isLoading = false;
    }

    async init() {
        this.bindEvents();
        await this.loadLeaderboard();
        await this.loadStats();
    }

    bindEvents() {
        // Sort headers
        document.querySelectorAll('.leaderboard-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sort = th.dataset.sort;
                if (this.sortBy === sort) {
                    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
                } else {
                    this.sortBy = sort;
                    this.sortOrder = 'desc';
                }
                this.loadLeaderboard();
            });
        });

        // Refresh button
        document.getElementById('refresh-leaderboard')?.addEventListener('click', () => {
            this.loadLeaderboard();
            this.loadStats();
        });

        // Upload button
        document.getElementById('upload-eval-btn')?.addEventListener('click', () => {
            this.showUploadModal();
        });

        // Modal close
        document.getElementById('upload-modal-close')?.addEventListener('click', () => {
            this.hideUploadModal();
        });

        // Upload form submit
        document.getElementById('upload-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEval();
        });

        // Use from eval builder button
        document.getElementById('use-eval-builder')?.addEventListener('click', () => {
            this.useEvalFromBuilder();
        });

        // View eval details close
        document.getElementById('eval-details-close')?.addEventListener('click', () => {
            this.hideEvalDetails();
        });

        // Play against button
        document.getElementById('play-against-eval')?.addEventListener('click', () => {
            this.playAgainstSelected();
        });
    }

    async loadLeaderboard() {
        this.isLoading = true;
        this.renderLoading();

        try {
            const response = await fetch(
                `${EVAL_SERVER_URL}/api/evals?sort=${this.sortBy}&order=${this.sortOrder}&limit=100`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await response.json();
            this.evals = data.evals || [];
            this.renderLeaderboard();
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.renderError('Unable to connect to eval server. Make sure the server is running.');
        } finally {
            this.isLoading = false;
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`${EVAL_SERVER_URL}/api/stats`);
            if (response.ok) {
                const stats = await response.json();
                this.renderStats(stats);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    renderLoading() {
        const tbody = document.getElementById('leaderboard-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="7">
                        <div class="loading-spinner"></div>
                        <span>Loading leaderboard...</span>
                    </td>
                </tr>
            `;
        }
    }

    renderError(message) {
        const tbody = document.getElementById('leaderboard-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="error-row">
                    <td colspan="7">
                        <div class="error-icon">⚠️</div>
                        <span>${message}</span>
                        <button class="retry-btn" onclick="leaderboard.loadLeaderboard()">Retry</button>
                    </td>
                </tr>
            `;
        }
    }

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;

        if (this.evals.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-message">
                            <span class="empty-icon">📊</span>
                            <p>No evals yet. Be the first to upload one!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.evals.map((evalData, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            const eloDisplay = evalData.elo !== null ? evalData.elo : '—';
            const confidenceDisplay = evalData.elo_confidence || '';
            const winRate = evalData.games_played > 0 
                ? Math.round((evalData.wins / evalData.games_played) * 100) + '%'
                : '—';

            return `
                <tr class="eval-row ${rankClass}" data-id="${evalData.id}">
                    <td class="rank-cell">
                        <span class="rank-badge">${rank}</span>
                    </td>
                    <td class="name-cell">
                        <div class="eval-name">${this.escapeHtml(evalData.name)}</div>
                        <div class="eval-author">by ${this.escapeHtml(evalData.author)}</div>
                    </td>
                    <td class="elo-cell">
                        <span class="elo-value">${eloDisplay}</span>
                        ${confidenceDisplay ? `<span class="elo-confidence">${confidenceDisplay}</span>` : ''}
                    </td>
                    <td class="games-cell">${evalData.games_played}</td>
                    <td class="record-cell">
                        <span class="wins">${evalData.wins}</span>
                        <span class="separator">/</span>
                        <span class="draws">${evalData.draws}</span>
                        <span class="separator">/</span>
                        <span class="losses">${evalData.losses}</span>
                    </td>
                    <td class="winrate-cell">${winRate}</td>
                    <td class="actions-cell">
                        <button class="view-btn" onclick="leaderboard.viewEval('${evalData.id}')" title="View Details">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="play-btn" onclick="leaderboard.playAgainst('${evalData.id}')" title="Play Against">
                            <i data-lucide="swords"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Update sort indicators
        document.querySelectorAll('.leaderboard-table th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === this.sortBy) {
                th.classList.add(`sort-${this.sortOrder}`);
            }
        });
    }

    renderStats(stats) {
        const totalEvalsEl = document.getElementById('total-evals');
        const totalMatchesEl = document.getElementById('total-matches');
        const topEvalEl = document.getElementById('top-eval');
        
        if (totalEvalsEl) totalEvalsEl.textContent = stats.total_evals || 0;
        if (totalMatchesEl) totalMatchesEl.textContent = stats.total_matches || 0;
        if (stats.top_eval && topEvalEl) {
            topEvalEl.textContent = `${stats.top_eval.name} (${stats.top_eval.elo})`;
        }
    }

    async viewEval(id) {
        try {
            const response = await fetch(`${EVAL_SERVER_URL}/api/evals/${id}`);
            if (!response.ok) throw new Error('Failed to fetch eval');
            
            const data = await response.json();
            this.selectedEval = data.eval;
            this.showEvalDetails(data.eval);
        } catch (error) {
            console.error('Failed to view eval:', error);
            this.showNotification('Failed to load eval details', 'error');
        }
    }

    showEvalDetails(evalData) {
        const modal = document.getElementById('eval-details-modal');
        if (!modal) return;

        document.getElementById('detail-name').textContent = evalData.name;
        document.getElementById('detail-author').textContent = evalData.author;
        document.getElementById('detail-elo').textContent = evalData.elo || '—';
        document.getElementById('detail-confidence').textContent = evalData.elo_confidence || '';
        document.getElementById('detail-games').textContent = evalData.games_played;
        document.getElementById('detail-record').textContent = 
            `${evalData.wins}W / ${evalData.draws}D / ${evalData.losses}L`;
        document.getElementById('detail-description').textContent = 
            evalData.description || 'No description provided.';

        // Display rules summary
        const rulesContainer = document.getElementById('detail-rules');
        if (rulesContainer && evalData.eval_config) {
            const config = evalData.eval_config;
            const rulesHtml = config.rules?.map(rule => 
                `<div class="rule-summary">
                    <span class="rule-name">${this.escapeHtml(rule.name)}</span>
                    <span class="rule-category">${this.formatCategory(rule.category)}</span>
                </div>`
            ).join('') || '<p>No rules defined</p>';
            rulesContainer.innerHTML = rulesHtml;
        }

        modal.classList.add('active');
    }

    hideEvalDetails() {
        const modal = document.getElementById('eval-details-modal');
        if (modal) modal.classList.remove('active');
        this.selectedEval = null;
    }

    showUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) modal.classList.add('active');
    }

    hideUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) modal.classList.remove('active');
    }

    useEvalFromBuilder() {
        if (window.evalBuilder) {
            const config = window.evalBuilder.getEvaluatorConfig();
            document.getElementById('upload-name').value = config.name;
            document.getElementById('upload-description').value = config.description || '';
            document.getElementById('upload-config').value = JSON.stringify(config, null, 2);
            this.showNotification('Eval loaded from builder', 'success');
        } else {
            this.showNotification('Eval builder not initialized. Please visit the Eval Builder tab first.', 'error');
        }
    }

    async submitEval() {
        const name = document.getElementById('upload-name').value.trim();
        const author = document.getElementById('upload-author').value.trim() || 'Anonymous';
        const description = document.getElementById('upload-description').value.trim();
        const configText = document.getElementById('upload-config').value.trim();

        if (!name) {
            this.showNotification('Please enter a name for your eval', 'error');
            return;
        }

        let evalConfig;
        try {
            evalConfig = JSON.parse(configText);
        } catch (e) {
            this.showNotification('Invalid JSON in eval config', 'error');
            return;
        }

        const submitBtn = document.getElementById('upload-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        try {
            const response = await fetch(`${EVAL_SERVER_URL}/api/evals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    author,
                    description,
                    eval_config: evalConfig,
                    is_public: true
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showNotification('Eval uploaded! ELO calculation will begin shortly.', 'success');
                this.hideUploadModal();
                this.loadLeaderboard();
                
                // Clear form
                document.getElementById('upload-name').value = '';
                document.getElementById('upload-description').value = '';
                document.getElementById('upload-config').value = '';
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            this.showNotification(`Upload failed: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload & Calculate ELO';
        }
    }

    async playAgainst(evalId) {
        try {
            const response = await fetch(`${EVAL_SERVER_URL}/api/evals/${evalId}`);
            if (!response.ok) throw new Error('Failed to fetch eval');
            
            const data = await response.json();
            const evalConfig = data.eval.eval_config;

            // Configure the engine with this eval
            await fetch('http://localhost:8765/api/configureRuleEval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evalConfig)
            });

            await fetch('http://localhost:8765/api/setEvaluator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'rule' })
            });

            // Switch to game tab
            document.querySelector('[data-tab="game-tab"]')?.click();

            // Update bot name display
            this.showNotification(`Now playing against: ${data.eval.name}`, 'success');

        } catch (error) {
            console.error('Failed to set up game:', error);
            this.showNotification('Failed to set up game. Make sure the engine server is running.', 'error');
        }
    }

    playAgainstSelected() {
        if (this.selectedEval) {
            this.playAgainst(this.selectedEval.id);
            this.hideEvalDetails();
        }
    }

    formatCategory(category) {
        if (!category) return '';
        return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.leaderboard-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `leaderboard-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize leaderboard when on that tab
let leaderboard;

function initLeaderboard() {
    if (!leaderboard) {
        leaderboard = new Leaderboard();
        leaderboard.init();
    }
}

// Export for global access
window.Leaderboard = Leaderboard;
window.leaderboard = null;
window.initLeaderboard = initLeaderboard;

