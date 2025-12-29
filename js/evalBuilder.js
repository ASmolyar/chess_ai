/**
 * Evaluation Function Builder
 * UI for creating custom chess evaluation functions using building blocks
 */

class EvalBuilder {
    constructor() {
        this.evaluator = {
            name: 'My Custom Evaluator',
            description: 'Custom evaluation function',
            rules: [],
            categoryWeights: {
                material: 1.0,
                mobility: 0.6,
                king_safety: 1.0,
                pawn_structure: 0.8,
                positional: 0.7,
                piece_coordination: 0.9,
                threats: 1.0
            }
        };
        
        this.editingRule = null;
        this.nextRuleId = 1;
        
        // Building blocks catalog
        this.catalog = this.createCatalog();
    }
    
    createCatalog() {
        return {
            conditions: {
                always: {
                    id: 'always',
                    name: 'Always Apply',
                    description: 'Rule applies every move (leave empty for same effect)',
                    icon: 'check',
                    params: []
                },
                game_phase: {
                    id: 'game_phase',
                    name: 'Game Phase',
                    description: 'Only apply in opening/middlegame/endgame (based on material left)',
                    icon: 'clock',
                    params: [
                        { name: 'phase', type: 'select', options: ['opening', 'middlegame', 'endgame', 'late_endgame'], label: 'Phase' }
                    ]
                },
                material: {
                    id: 'material',
                    name: 'Material Count',
                    description: 'Only apply if a certain number of pieces exist on board',
                    icon: 'hash',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'Piece' },
                        { name: 'player', type: 'select', options: ['my', 'opponent', 'both'], label: 'Whose pieces?' },
                        { name: 'comparison', type: 'select', options: ['at_least', 'at_most', 'exactly', 'more_than', 'less_than'], label: 'Compare' },
                        { name: 'count', type: 'number', min: 0, max: 10, label: 'Number of pieces' }
                    ]
                },
                castling: {
                    id: 'castling',
                    name: 'Castling Status',
                    description: 'Only apply based on castling state (rewarding safety)',
                    icon: 'castle',
                    params: [
                        { name: 'player', type: 'select', options: ['my', 'opponent'], label: 'Whose castling?' },
                        { name: 'status', type: 'select', options: ['has_castled_either', 'has_castled_kingside', 'has_castled_queenside', 'has_not_castled', 'can_still_castle', 'cannot_castle'], label: 'Status' }
                    ]
                },
                piece_distance: {
                    id: 'piece_distance',
                    name: 'Piece Distance',
                    description: 'Only apply if two pieces are within/beyond a certain distance',
                    icon: 'move-horizontal',
                    params: [
                        { name: 'piece1Type', type: 'select', options: ['any', 'king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 1' },
                        { name: 'piece1Color', type: 'select', options: ['my', 'opponent'], label: 'Piece 1 Owner' },
                        { name: 'piece2Type', type: 'select', options: ['any', 'king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 2' },
                        { name: 'piece2Color', type: 'select', options: ['my', 'opponent'], label: 'Piece 2 Owner' },
                        { name: 'comparison', type: 'select', options: ['less_than', 'less_equal', 'greater_than', 'greater_equal', 'exactly'], label: 'Compare' },
                        { name: 'distance', type: 'number', min: 1, max: 14, label: 'Squares apart' }
                    ]
                }
            },
            targets: {
                simple_material: {
                    id: 'simple_material',
                    name: 'Count Pieces',
                    description: 'Counts how many of this piece you have (e.g., 2 bishops → value × 2)',
                    icon: 'boxes',
                    category: 'material',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'Piece Type' }
                    ]
                },
                mobility: {
                    id: 'mobility',
                    name: 'Piece Mobility',
                    description: 'Counts legal moves for this piece type (more moves = more active)',
                    icon: 'move-diagonal',
                    category: 'mobility',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['any', 'knight', 'bishop', 'rook', 'queen', 'king'], label: 'Piece Type' },
                        { name: 'captureWeight', type: 'number', min: 0.5, max: 3, step: 0.1, label: 'Capture bonus (2 = captures count double)', default: 1.0 }
                    ]
                },
                defense: {
                    id: 'defense',
                    name: 'Defended Pieces',
                    description: 'Counts pieces protected by friendly pieces (defended = safer)',
                    icon: 'shield',
                    category: 'piece_coordination',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'Defended Piece' },
                        { name: 'defenderType', type: 'select', options: ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'Defender Piece' },
                        { name: 'minDefenders', type: 'number', min: 1, max: 5, label: 'Minimum defenders needed' }
                    ]
                },
                piece_distance: {
                    id: 'piece_distance',
                    name: 'Piece Distance',
                    description: 'Measures squares between two pieces (useful in endgames)',
                    icon: 'ruler',
                    category: 'positional',
                    params: [
                        { name: 'piece1Type', type: 'select', options: ['any', 'king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 1' },
                        { name: 'piece1Color', type: 'select', options: ['my', 'opponent'], label: 'Piece 1 Owner' },
                        { name: 'piece2Type', type: 'select', options: ['any', 'king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 2' },
                        { name: 'piece2Color', type: 'select', options: ['my', 'opponent'], label: 'Piece 2 Owner' },
                        { name: 'distanceType', type: 'select', options: ['manhattan', 'chebyshev'], label: 'Method', info: 'Manhattan = horizontal + vertical squares. Chebyshev = minimum king moves to reach.' }
                    ]
                },
                pawn_advancement: {
                    id: 'pawn_advancement',
                    name: 'Pawn Advancement',
                    description: 'Rewards pawns that have pushed forward (closer to promotion)',
                    icon: 'arrow-up',
                    category: 'pawn_structure',
                    params: []
                },
                king_safety: {
                    id: 'king_safety',
                    name: 'King Safety',
                    description: 'Counts enemy attacks near your king (returns negative = danger!)',
                    icon: 'shield-alert',
                    category: 'king_safety',
                    params: []
                },
                check: {
                    id: 'check',
                    name: 'Giving Check',
                    description: 'Bonus when you are giving check to opponent\'s king',
                    icon: 'zap',
                    category: 'threats',
                    params: []
                },
                global: {
                    id: 'global',
                    name: 'Position Bonus',
                    description: 'A one-time bonus for the position (use with conditions like "has castled")',
                    icon: 'globe',
                    category: 'positional',
                    params: []
                }
            },
            values: {
                fixed: {
                    id: 'fixed',
                    name: 'Fixed Value',
                    description: 'Award a fixed score (e.g., +100 per pawn)',
                    icon: 'equal',
                    params: [
                        { name: 'value', type: 'number', min: -1000, max: 1000, label: 'Centipawns', info: '1 centipawn = 1/100th of a pawn. Standard values: Pawn=100, Knight/Bishop=300-350, Rook=500, Queen=900-1000' }
                    ]
                },
                formula: {
                    id: 'formula',
                    name: 'Custom Formula',
                    description: 'Write your own math formula using n (the count from target)',
                    icon: 'function-square',
                    params: [
                        { name: 'formula', type: 'formula', label: 'Formula (use n for count)', placeholder: '10 * sqrt(n)', default: 'n * 10' }
                    ]
                }
            }
        };
    }
    
    init() {
        this.renderCatalog();
        this.renderRulesList();
        this.renderCategoryWeights();
        this.bindEvents();
        this.loadFromStorage();
        
        // Global click handler to close tooltips
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.param-info-btn') && !e.target.closest('.param-tooltip')) {
                document.querySelectorAll('.param-tooltip.visible').forEach(t => t.classList.remove('visible'));
            }
        });
        
        // Reinitialize Lucide icons for dynamically created elements
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    renderCatalog() {
        // Render condition blocks
        const conditionsEl = document.getElementById('condition-blocks');
        conditionsEl.innerHTML = '';
        Object.values(this.catalog.conditions).forEach(block => {
            conditionsEl.appendChild(this.createBlockElement(block, 'condition'));
        });
        
        // Render target blocks
        const targetsEl = document.getElementById('target-blocks');
        targetsEl.innerHTML = '';
        Object.values(this.catalog.targets).forEach(block => {
            targetsEl.appendChild(this.createBlockElement(block, 'target'));
        });
        
        // Render value blocks
        const valuesEl = document.getElementById('value-blocks');
        valuesEl.innerHTML = '';
        Object.values(this.catalog.values).forEach(block => {
            valuesEl.appendChild(this.createBlockElement(block, 'value'));
        });
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    createBlockElement(block, type) {
        const el = document.createElement('div');
        el.className = `block-item block-${type}`;
        el.dataset.blockId = block.id;
        el.dataset.blockType = type;
        el.draggable = true;
        
        // Create content matching slot layout
        const content = document.createElement('div');
        content.className = 'block-content';
        
        // Header with icon and name
        const header = document.createElement('div');
        header.className = 'block-header';
        header.innerHTML = `
            <span class="block-icon"><i data-lucide="${block.icon}"></i></span>
            <span class="block-name">${block.name}</span>
        `;
        content.appendChild(header);
        
        // Description
        if (block.description) {
            const desc = document.createElement('div');
            desc.className = 'block-desc';
            desc.textContent = block.description;
            content.appendChild(desc);
        }
        
        // Add greyed-out parameters preview
        if (block.params && block.params.length > 0) {
            const paramsEl = document.createElement('div');
            paramsEl.className = 'block-params-preview';
            block.params.forEach(param => {
                paramsEl.appendChild(this.createDisabledParamInput(param));
            });
            content.appendChild(paramsEl);
        }
        
        el.appendChild(content);
        
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ type, id: block.id }));
            el.classList.add('dragging');
        });
        
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });
        
        el.addEventListener('click', () => {
            this.selectBlock(block, type);
        });
        
        return el;
    }
    
    createDisabledParamInput(param) {
        const wrapper = document.createElement('div');
        wrapper.className = 'param-row disabled';
        
        const label = document.createElement('label');
        label.textContent = param.label;
        wrapper.appendChild(label);
        
        let input;
        if (param.type === 'select') {
            input = document.createElement('select');
            input.disabled = true;
            const option = document.createElement('option');
            option.textContent = '—';
            input.appendChild(option);
        } else if (param.type === 'formula') {
            input = document.createElement('input');
            input.type = 'text';
            input.disabled = true;
            input.placeholder = 'formula';
            input.className = 'param-input formula-input';
        } else {
            input = document.createElement('input');
            input.type = param.type === 'number' ? 'number' : 'text';
            input.disabled = true;
            input.placeholder = '—';
        }
        
        input.className = (input.className || '') + ' param-input';
        wrapper.appendChild(input);
        
        return wrapper;
    }
    
    selectBlock(block, type) {
        // Add block to current rule builder
        const slotEl = document.getElementById(`rule-${type}-slot`);
        this.setSlotContent(slotEl, block, type);
    }
    
    setSlotContent(slotEl, block, type) {
        slotEl.innerHTML = '';
        slotEl.classList.remove('empty', 'required');
        slotEl.dataset.blockId = block.id;
        
        const content = document.createElement('div');
        content.className = `slot-content slot-${type}`;
        
        // Header with icon and name
        const header = document.createElement('div');
        header.className = 'slot-header';
        header.innerHTML = `
            <span class="slot-icon"><i data-lucide="${block.icon}"></i></span>
            <span class="slot-name">${block.name}</span>
        `;
        content.appendChild(header);
        
        // Description/hint (same as bank)
        if (block.description) {
            const desc = document.createElement('div');
            desc.className = 'slot-desc';
            desc.textContent = block.description;
            content.appendChild(desc);
        }
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'slot-remove';
        removeBtn.title = 'Remove';
        removeBtn.innerHTML = '<i data-lucide="x"></i>';
        removeBtn.addEventListener('click', () => {
            this.clearSlot(slotEl, type);
        });
        content.appendChild(removeBtn);
        
        // Add parameters
        if (block.params && block.params.length > 0) {
            const paramsEl = document.createElement('div');
            paramsEl.className = 'slot-params';
            block.params.forEach(param => {
                paramsEl.appendChild(this.createParamInput(param));
            });
            content.appendChild(paramsEl);
        }
        
        slotEl.appendChild(content);
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Sync heights after content change
        this.syncSlotHeights();
    }
    
    createParamInput(param) {
        const wrapper = document.createElement('div');
        wrapper.className = 'param-row';
        
        // Label container (with optional info button)
        const labelContainer = document.createElement('div');
        labelContainer.className = 'param-label-container';
        
        const label = document.createElement('label');
        label.textContent = param.label;
        labelContainer.appendChild(label);
        
        // Add info button if param has info property
        if (param.info) {
            const infoBtn = document.createElement('button');
            infoBtn.type = 'button';
            infoBtn.className = 'param-info-btn';
            infoBtn.innerHTML = '<i data-lucide="info"></i>';
            infoBtn.title = 'More info';
            
            const tooltip = document.createElement('div');
            tooltip.className = 'param-tooltip';
            tooltip.textContent = param.info;
            
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other tooltips first
                document.querySelectorAll('.param-tooltip.visible').forEach(t => {
                    if (t !== tooltip) t.classList.remove('visible');
                });
                tooltip.classList.toggle('visible');
            });
            
            labelContainer.appendChild(infoBtn);
            labelContainer.appendChild(tooltip);
        }
        
        wrapper.appendChild(labelContainer);
        
        let input;
        if (param.type === 'select') {
            input = document.createElement('select');
            param.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = this.formatOption(opt);
                input.appendChild(option);
            });
        } else if (param.type === 'formula') {
            // Formula input with validation
            const formulaWrapper = document.createElement('div');
            formulaWrapper.className = 'formula-input-wrapper';
            
            // Input row with info button
            const inputRow = document.createElement('div');
            inputRow.className = 'formula-input-row';
            
            input = document.createElement('input');
            input.type = 'text';
            input.placeholder = param.placeholder || 'n * 10';
            input.value = param.default || 'n * 10';
            input.name = param.name;
            input.className = 'param-input formula-input';
            
            // Info button with tooltip
            const infoBtn = document.createElement('button');
            infoBtn.type = 'button';
            infoBtn.className = 'formula-info-btn';
            infoBtn.innerHTML = '<i data-lucide="info"></i>';
            infoBtn.title = 'Formula examples';
            
            // Tooltip with examples
            const tooltip = document.createElement('div');
            tooltip.className = 'formula-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-title">Formula Examples</div>
                <div class="tooltip-item"><code>n * 10</code> — 10 cp per unit</div>
                <div class="tooltip-item"><code>10 * sqrt(n)</code> — diminishing returns</div>
                <div class="tooltip-item"><code>n^2 / 10</code> — accelerating</div>
                <div class="tooltip-item"><code>100 * log(n + 1)</code> — logarithmic</div>
                <div class="tooltip-item"><code>-5 * n</code> — penalty</div>
                <div class="tooltip-note">n = count from target</div>
            `;
            
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tooltip.classList.toggle('visible');
            });
            
            // Close tooltip when clicking elsewhere
            document.addEventListener('click', () => {
                tooltip.classList.remove('visible');
            });
            
            inputRow.appendChild(input);
            inputRow.appendChild(infoBtn);
            inputRow.appendChild(tooltip);
            
            const validationMsg = document.createElement('div');
            validationMsg.className = 'formula-validation';
            
            // Validate on input
            input.addEventListener('input', () => {
                const result = this.validateFormula(input.value);
                if (result.valid) {
                    validationMsg.textContent = `✓ Preview: n=4 → ${result.preview}`;
                    validationMsg.className = 'formula-validation valid';
                    input.classList.remove('invalid');
                } else {
                    validationMsg.textContent = `✗ ${result.error}`;
                    validationMsg.className = 'formula-validation invalid';
                    input.classList.add('invalid');
                }
            });
            
            // Initial validation
            setTimeout(() => {
                input.dispatchEvent(new Event('input'));
                // Reinitialize lucide icons for the info button
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 0);
            
            formulaWrapper.appendChild(inputRow);
            formulaWrapper.appendChild(validationMsg);
            wrapper.appendChild(formulaWrapper);
            return wrapper;
        } else {
            input = document.createElement('input');
            input.type = 'number';
            input.min = param.min ?? -1000;
            input.max = param.max ?? 1000;
            input.step = param.step ?? 1;
            input.value = param.default ?? (param.min ?? 0);
        }
        
        input.name = param.name;
        input.className = 'param-input';
        wrapper.appendChild(input);
        
        return wrapper;
    }
    
    // Validate a formula - ensure it only uses n and safe math operations
    validateFormula(formula) {
        if (!formula || formula.trim() === '') {
            return { valid: false, error: 'Formula cannot be empty' };
        }
        
        // Check that 'n' appears at least once
        if (!/\bn\b/.test(formula)) {
            return { valid: false, error: "Formula must contain 'n' (the count variable)" };
        }
        
        // Whitelist of allowed tokens
        const allowedPattern = /^[\d\s\+\-\*\/\(\)\.\^n]*(sqrt|abs|log|ln|sin|cos|tan|floor|ceil|round|min|max|pow|exp)*[\d\s\+\-\*\/\(\)\.\^n]*$/i;
        
        // Remove allowed function names and check remaining chars
        const sanitized = formula
            .replace(/\b(sqrt|abs|log|ln|sin|cos|tan|floor|ceil|round|min|max|pow|exp)\b/gi, '')
            .replace(/\bn\b/g, '')
            .replace(/[\d\s\+\-\*\/\(\)\.\^,]/g, '');
        
        if (sanitized.length > 0) {
            return { valid: false, error: `Invalid characters: ${sanitized.substring(0, 10)}` };
        }
        
        // Try to evaluate with a test value
        try {
            const jsFormula = this.formulaToJS(formula);
            const testFn = new Function('n', `return ${jsFormula}`);
            const result = testFn(4);
            
            if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                return { valid: false, error: 'Formula does not produce a valid number' };
            }
            
            return { valid: true, preview: Math.round(result * 100) / 100 };
        } catch (e) {
            return { valid: false, error: 'Invalid formula syntax' };
        }
    }
    
    // Convert formula to JavaScript-safe expression
    formulaToJS(formula) {
        return formula
            .replace(/\^/g, '**')                    // ^ to **
            .replace(/\bsqrt\b/gi, 'Math.sqrt')      // sqrt to Math.sqrt
            .replace(/\babs\b/gi, 'Math.abs')
            .replace(/\blog\b/gi, 'Math.log10')      // log = log base 10
            .replace(/\bln\b/gi, 'Math.log')         // ln = natural log
            .replace(/\bsin\b/gi, 'Math.sin')
            .replace(/\bcos\b/gi, 'Math.cos')
            .replace(/\btan\b/gi, 'Math.tan')
            .replace(/\bfloor\b/gi, 'Math.floor')
            .replace(/\bceil\b/gi, 'Math.ceil')
            .replace(/\bround\b/gi, 'Math.round')
            .replace(/\bmin\b/gi, 'Math.min')
            .replace(/\bmax\b/gi, 'Math.max')
            .replace(/\bpow\b/gi, 'Math.pow')
            .replace(/\bexp\b/gi, 'Math.exp');
    }
    
    formatOption(opt) {
        return opt.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    clearSlot(slotEl, type) {
        const placeholders = {
            condition: 'Click to add condition',
            target: 'Click to add target',
            value: 'Click to add value'
        };
        slotEl.innerHTML = `<span class="slot-placeholder">${placeholders[type] || 'Click to add'}</span>`;
        slotEl.classList.add('empty', 'required');
        delete slotEl.dataset.blockId;
        
        // Sync heights after clearing
        this.syncSlotHeights();
    }
    
    syncSlotHeights() {
        // Use requestAnimationFrame to wait for DOM to update
        requestAnimationFrame(() => {
            const slots = document.querySelectorAll('.drop-slot');
            if (slots.length === 0) return;
            
            // Reset heights first
            slots.forEach(slot => {
                slot.style.height = 'auto';
            });
            
            // Find the tallest slot
            let maxHeight = 140; // Minimum height
            slots.forEach(slot => {
                maxHeight = Math.max(maxHeight, slot.scrollHeight);
            });
            
            // Apply the same height to all slots
            slots.forEach(slot => {
                slot.style.height = maxHeight + 'px';
            });
        });
    }
    
    renderRulesList() {
        const listEl = document.getElementById('rules-list');
        const countEl = document.getElementById('rules-count');
        listEl.innerHTML = '';
        
        // Update rules count
        const enabledCount = this.evaluator.rules.filter(r => r.enabled).length;
        const totalCount = this.evaluator.rules.length;
        if (countEl) {
            countEl.textContent = totalCount > 0 ? `(${enabledCount}/${totalCount} active)` : '';
        }
        
        if (this.evaluator.rules.length === 0) {
            listEl.innerHTML = '<div class="empty-rules">No rules yet. Create one using the builder above!</div>';
            return;
        }
        
        this.evaluator.rules.forEach((rule, index) => {
            const ruleEl = document.createElement('div');
            ruleEl.className = `rule-item ${rule.enabled ? '' : 'disabled'}`;
            ruleEl.dataset.ruleId = rule.id;
            
            ruleEl.innerHTML = `
                <div class="rule-header">
                    <label class="rule-toggle">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="rule-name">${rule.name}</span>
                    <span class="rule-category">${this.formatOption(rule.category)}</span>
                    <div class="rule-actions">
                        <button class="rule-edit" title="Edit"><i data-lucide="pencil"></i></button>
                        <button class="rule-delete" title="Delete"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
                <div class="rule-preview">${this.getRulePreview(rule)}</div>
            `;
            
            ruleEl.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                rule.enabled = e.target.checked;
                ruleEl.classList.toggle('disabled', !rule.enabled);
                this.saveToStorage();
            });
            
            ruleEl.querySelector('.rule-edit').addEventListener('click', () => {
                this.editRule(rule);
            });
            
            ruleEl.querySelector('.rule-delete').addEventListener('click', () => {
                this.deleteRule(rule.id);
            });
            
            listEl.appendChild(ruleEl);
        });
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    getRulePreview(rule) {
        let preview = '';
        
        // Condition
        if (rule.condition && rule.condition.type !== 'always') {
            preview += `When: <em>${this.describeCondition(rule.condition)}</em> → `;
        }
        
        // Target
        if (rule.target) {
            preview += `${this.describeTarget(rule.target)}: `;
        }
        
        // Value
        if (rule.value) {
            preview += `<strong>${this.describeValue(rule.value)}</strong>`;
        }
        
        return preview || 'Incomplete rule';
    }
    
    describeCondition(cond) {
        const block = this.catalog.conditions[cond.type];
        if (!block) return cond.type;
        
        switch (cond.type) {
            case 'game_phase':
                return `In ${this.formatOption(cond.phase || 'unknown')}`;
            case 'material':
                return `${this.formatOption(cond.player || '')} has ${cond.comparison?.replace('_', ' ')} ${cond.count} ${cond.pieceType}s`;
            case 'castling':
                return `${this.formatOption(cond.player || '')} ${cond.status?.replace(/_/g, ' ')}`;
            case 'piece_distance':
                return `${cond.piece1Type} ${cond.comparison?.replace('_', ' ')} ${cond.distance} from ${cond.piece2Type}`;
            default:
                return block.name;
        }
    }
    
    describeTarget(target) {
        const block = this.catalog.targets[target.type];
        if (!block) return target.type;
        
        switch (target.type) {
            case 'simple_material':
                return `Each ${target.pieceType || 'piece'}`;
            case 'mobility':
                return `${this.formatOption(target.pieceType || 'piece')} mobility`;
            case 'defense':
                const defenderDesc = target.defenderType && target.defenderType !== 'any' 
                    ? ` by ${target.defenderType}s` : '';
                return `Defended ${target.pieceType || 'piece'}s${defenderDesc} (${target.minDefenders}+)`;
            case 'piece_distance':
                return `${target.piece1Type}-${target.piece2Type} distance`;
            case 'pawn_advancement':
                return 'Pawn advancement';
            case 'check':
                return 'Giving check';
            case 'global':
                return 'Position';
            default:
                return block.name;
        }
    }
    
    describeValue(value) {
        switch (value.type) {
            case 'fixed':
                const v = value.value || 0;
                return `${v >= 0 ? '+' : ''}${v} cp`;
            case 'formula':
                const formula = value.formula || 'n';
                return `f(n) = ${formula}`;
            default:
                return 'value';
        }
    }
    
    renderCategoryWeights() {
        const container = document.getElementById('category-weights');
        container.innerHTML = '';
        
        Object.entries(this.evaluator.categoryWeights).forEach(([category, weight]) => {
            const row = document.createElement('div');
            row.className = 'weight-row';
            
            row.innerHTML = `
                <label>${this.formatOption(category)}</label>
                <input type="range" min="0" max="200" value="${weight * 100}" 
                       data-category="${category}" class="weight-slider">
                <span class="weight-value">${weight.toFixed(1)}</span>
            `;
            
            row.querySelector('.weight-slider').addEventListener('input', (e) => {
                const newWeight = parseInt(e.target.value) / 100;
                this.evaluator.categoryWeights[category] = newWeight;
                row.querySelector('.weight-value').textContent = newWeight.toFixed(1);
                this.saveToStorage();
            });
            
            container.appendChild(row);
        });
    }
    
    bindEvents() {
        // Drop zones
        ['condition', 'target', 'value'].forEach(type => {
            const slot = document.getElementById(`rule-${type}-slot`);
            
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    if (data.type === type) {
                        const block = this.catalog[type + 's'][data.id];
                        if (block) {
                            this.setSlotContent(slot, block, type);
                        }
                    }
                } catch (err) {}
            });
            
            slot.addEventListener('click', (e) => {
                if (slot.classList.contains('empty')) {
                    this.showBlockPicker(type, slot);
                }
            });
        });
        
        // Add rule button
        document.getElementById('add-rule-btn').addEventListener('click', () => {
            this.addCurrentRule();
        });
        
        // Clear builder button
        document.getElementById('clear-builder-btn').addEventListener('click', () => {
            this.clearBuilder();
        });
        
        // Save evaluator button
        document.getElementById('save-eval-btn').addEventListener('click', () => {
            this.saveEvaluator();
        });
        
        // Load evaluator button
        document.getElementById('load-eval-btn').addEventListener('click', () => {
            this.showLoadDialog();
        });
        
        // Export JSON button
        document.getElementById('export-json-btn').addEventListener('click', () => {
            this.exportJson();
        });
        
        // Publish to leaderboard button
        document.getElementById('publish-eval-btn')?.addEventListener('click', () => {
            this.publishToLeaderboard();
        });
        
        // Evaluator name input
        document.getElementById('eval-name-input').addEventListener('change', (e) => {
            this.evaluator.name = e.target.value;
            this.saveToStorage();
        });
        
        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadTemplate(btn.dataset.template);
            });
        });
    }
    
    showBlockPicker(type, slot) {
        // For simplicity, scroll to the relevant catalog section
        const section = document.getElementById(`${type}-blocks`);
        section.scrollIntoView({ behavior: 'smooth' });
        section.classList.add('highlight');
        setTimeout(() => section.classList.remove('highlight'), 1000);
    }
    
    addCurrentRule() {
        const condSlot = document.getElementById('rule-condition-slot');
        const targetSlot = document.getElementById('rule-target-slot');
        const valueSlot = document.getElementById('rule-value-slot');
        const nameInput = document.getElementById('rule-name-input');
        
        // Validate all three slots
        if (!condSlot.dataset.blockId) {
            this.showNotification('Please select a condition for your rule', 'error');
            condSlot.classList.add('shake');
            setTimeout(() => condSlot.classList.remove('shake'), 500);
            return;
        }
        
        if (!targetSlot.dataset.blockId) {
            this.showNotification('Please select a target for your rule', 'error');
            targetSlot.classList.add('shake');
            setTimeout(() => targetSlot.classList.remove('shake'), 500);
            return;
        }
        
        if (!valueSlot.dataset.blockId) {
            this.showNotification('Please select a value for your rule', 'error');
            valueSlot.classList.add('shake');
            setTimeout(() => valueSlot.classList.remove('shake'), 500);
            return;
        }
        
        // Build rule
        const rule = {
            id: this.editingRule ? this.editingRule.id : `rule_${this.nextRuleId++}`,
            name: nameInput.value || 'Unnamed Rule',
            enabled: true,
            category: this.catalog.targets[targetSlot.dataset.blockId]?.category || 'positional',
            weight: 1.0
        };
        
        // Condition
        rule.condition = this.getSlotData(condSlot, 'condition');
        
        // Target
        rule.target = this.getSlotData(targetSlot, 'target');
        
        // Value
        rule.value = this.getSlotData(valueSlot, 'value');
        
        // Add or update
        if (this.editingRule) {
            const index = this.evaluator.rules.findIndex(r => r.id === this.editingRule.id);
            if (index >= 0) {
                this.evaluator.rules[index] = rule;
            }
            this.editingRule = null;
        } else {
            this.evaluator.rules.push(rule);
        }
        
        this.renderRulesList();
        this.clearBuilder();
        this.saveToStorage();
        this.showNotification('Rule added successfully!', 'success');
    }
    
    getSlotData(slot, type) {
        const blockId = slot.dataset.blockId;
        const data = { type: blockId };
        
        slot.querySelectorAll('.param-input').forEach(input => {
            let value = input.value;
            if (input.type === 'number') {
                value = parseFloat(value);
            }
            data[input.name] = value;
        });
        
        return data;
    }
    
    editRule(rule) {
        this.editingRule = rule;
        
        // Populate builder with rule data
        document.getElementById('rule-name-input').value = rule.name;
        
        // Condition
        if (rule.condition && this.catalog.conditions[rule.condition.type]) {
            const block = this.catalog.conditions[rule.condition.type];
            const slot = document.getElementById('rule-condition-slot');
            this.setSlotContent(slot, block, 'condition');
            this.populateSlotParams(slot, rule.condition);
        }
        
        // Target
        if (rule.target && this.catalog.targets[rule.target.type]) {
            const block = this.catalog.targets[rule.target.type];
            const slot = document.getElementById('rule-target-slot');
            this.setSlotContent(slot, block, 'target');
            this.populateSlotParams(slot, rule.target);
        }
        
        // Value
        if (rule.value && this.catalog.values[rule.value.type]) {
            const block = this.catalog.values[rule.value.type];
            const slot = document.getElementById('rule-value-slot');
            this.setSlotContent(slot, block, 'value');
            this.populateSlotParams(slot, rule.value);
        }
        
        // Scroll to builder
        document.querySelector('.rule-builder').scrollIntoView({ behavior: 'smooth' });
    }
    
    populateSlotParams(slot, data) {
        slot.querySelectorAll('.param-input').forEach(input => {
            if (data[input.name] !== undefined) {
                input.value = data[input.name];
            }
        });
    }
    
    deleteRule(ruleId) {
        this.evaluator.rules = this.evaluator.rules.filter(r => r.id !== ruleId);
        this.renderRulesList();
        this.saveToStorage();
        this.showNotification('Rule deleted', 'info');
    }
    
    clearBuilder() {
        this.editingRule = null;
        document.getElementById('rule-name-input').value = '';
        
        ['condition', 'target', 'value'].forEach(type => {
            const slot = document.getElementById(`rule-${type}-slot`);
            this.clearSlot(slot, type);
        });
    }
    
    saveToStorage() {
        try {
            localStorage.setItem('chess_eval_builder', JSON.stringify(this.evaluator));
        } catch (e) {}
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('chess_eval_builder');
            if (saved) {
                const data = JSON.parse(saved);
                this.evaluator = { ...this.evaluator, ...data };
                this.nextRuleId = Math.max(
                    ...this.evaluator.rules.map(r => parseInt(r.id.replace('rule_', '')) || 0),
                    0
                ) + 1;
                
                document.getElementById('eval-name-input').value = this.evaluator.name;
                this.renderRulesList();
                this.renderCategoryWeights();
            }
        } catch (e) {}
    }
    
    saveEvaluator() {
        const name = prompt('Save evaluator as:', this.evaluator.name);
        if (!name) return;
        
        this.evaluator.name = name;
        document.getElementById('eval-name-input').value = name;
        
        // Save to localStorage list
        try {
            const saved = JSON.parse(localStorage.getItem('chess_saved_evals') || '{}');
            saved[name] = this.evaluator;
            localStorage.setItem('chess_saved_evals', JSON.stringify(saved));
            this.showNotification(`Saved "${name}"`, 'success');
        } catch (e) {
            this.showNotification('Failed to save', 'error');
        }
    }
    
    showLoadDialog() {
        try {
            const saved = JSON.parse(localStorage.getItem('chess_saved_evals') || '{}');
            const names = Object.keys(saved);
            
            if (names.length === 0) {
                this.showNotification('No saved evaluators found', 'info');
                return;
            }
            
            const name = prompt('Load evaluator:\n\n' + names.join('\n'));
            if (name && saved[name]) {
                this.evaluator = saved[name];
                document.getElementById('eval-name-input').value = this.evaluator.name;
                this.renderRulesList();
                this.renderCategoryWeights();
                this.showNotification(`Loaded "${name}"`, 'success');
            }
        } catch (e) {
            this.showNotification('Failed to load', 'error');
        }
    }
    
    exportJson() {
        const json = JSON.stringify(this.evaluator, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.evaluator.name.replace(/\s+/g, '_')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Exported to JSON', 'success');
    }
    
    loadTemplate(templateName) {
        switch (templateName) {
            case 'simple':
                this.evaluator = this.createSimpleTemplate();
                break;
            case 'turing':
                this.evaluator = this.createTuringTemplate();
                break;
            case 'aggressive':
                this.evaluator = this.createAggressiveTemplate();
                break;
            default:
                return;
        }
        
        document.getElementById('eval-name-input').value = this.evaluator.name;
        this.renderRulesList();
        this.renderCategoryWeights();
        this.saveToStorage();
        this.showNotification(`Loaded "${templateName}" template`, 'success');
    }
    
    createSimpleTemplate() {
        return {
            name: 'Simple Material',
            description: 'Basic material counting',
            rules: [
                { id: 'rule_1', name: 'Pawns', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'pawn' }, value: { type: 'fixed', value: 100 } },
                { id: 'rule_2', name: 'Knights', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'knight' }, value: { type: 'fixed', value: 320 } },
                { id: 'rule_3', name: 'Bishops', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'bishop' }, value: { type: 'fixed', value: 330 } },
                { id: 'rule_4', name: 'Rooks', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'rook' }, value: { type: 'fixed', value: 500 } },
                { id: 'rule_5', name: 'Queens', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'queen' }, value: { type: 'fixed', value: 900 } }
            ],
            categoryWeights: { material: 1.0, mobility: 0, king_safety: 0, pawn_structure: 0, positional: 0, piece_coordination: 0, threats: 0 }
        };
    }
    
    createTuringTemplate() {
        // Exact match of TuringEval.java
        return {
            name: 'Turing (Exact)',
            description: "Exact implementation of Alan Turing's historical evaluation function",
            rules: [
                // === MATERIAL (lines 53-57 in TuringEval.java) ===
                { id: 'rule_1', name: 'Pawns', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'pawn' }, value: { type: 'fixed', value: 100 } },
                { id: 'rule_2', name: 'Knights', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'knight' }, value: { type: 'fixed', value: 300 } },
                { id: 'rule_3', name: 'Bishops', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'bishop' }, value: { type: 'fixed', value: 350 } },
                { id: 'rule_4', name: 'Rooks', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'rook' }, value: { type: 'fixed', value: 500 } },
                { id: 'rule_5', name: 'Queens', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'queen' }, value: { type: 'fixed', value: 1000 } },
                
                // === MOBILITY (lines 59-89, 106-127) - sqrt(moves + captures*2) * 10 ===
                { id: 'rule_6', name: 'Knight Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'knight', captureWeight: 2 }, value: { type: 'formula', formula: '10 * sqrt(n)' } },
                { id: 'rule_7', name: 'Bishop Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'bishop', captureWeight: 2 }, value: { type: 'formula', formula: '10 * sqrt(n)' } },
                { id: 'rule_8', name: 'Rook Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'rook', captureWeight: 2 }, value: { type: 'formula', formula: '10 * sqrt(n)' } },
                { id: 'rule_9', name: 'Queen Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'queen', captureWeight: 2 }, value: { type: 'formula', formula: '10 * sqrt(n)' } },
                
                // === KING MOBILITY (lines 92-94) - sqrt(kingMoves) * 10 ===
                { id: 'rule_10', name: 'King Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'king', captureWeight: 1 }, value: { type: 'formula', formula: '10 * sqrt(n)' } },
                
                // === DEFENSE BONUS (lines 65, 73, 81, 129-134) - +15 for 2+, +10 for 1 ===
                { id: 'rule_11', name: 'Knight Defense (2+)', enabled: true, category: 'piece_coordination', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'knight', defenderType: 'any', minDefenders: 2 }, value: { type: 'fixed', value: 15 } },
                { id: 'rule_12', name: 'Knight Defense (1)', enabled: true, category: 'piece_coordination', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'knight', defenderType: 'any', minDefenders: 1 }, value: { type: 'fixed', value: 10 } },
                { id: 'rule_13', name: 'Bishop Defense (2+)', enabled: true, category: 'piece_coordination', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'bishop', defenderType: 'any', minDefenders: 2 }, value: { type: 'fixed', value: 15 } },
                { id: 'rule_14', name: 'Bishop Defense (1)', enabled: true, category: 'piece_coordination', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'bishop', defenderType: 'any', minDefenders: 1 }, value: { type: 'fixed', value: 10 } },
                { id: 'rule_15', name: 'Rook Defense (2+)', enabled: true, category: 'piece_coordination', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'rook', defenderType: 'any', minDefenders: 2 }, value: { type: 'fixed', value: 15 } },
                { id: 'rule_16', name: 'Rook Defense (1)', enabled: true, category: 'piece_coordination', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'rook', defenderType: 'any', minDefenders: 1 }, value: { type: 'fixed', value: 10 } },
                
                // === KING SAFETY (lines 160-163) - -1 per attack square ===
                { id: 'rule_17', name: 'King Safety', enabled: true, category: 'king_safety', condition: { type: 'always' }, target: { type: 'king_safety' }, value: { type: 'formula', formula: '-1 * n' } },
                
                // === PAWN ADVANCEMENT (lines 166-187) - +20 per rank, +30 if defended by non-pawn ===
                { id: 'rule_18', name: 'Pawn Advancement', enabled: true, category: 'pawn_structure', condition: { type: 'always' }, target: { type: 'pawn_advancement' }, value: { type: 'formula', formula: '20 * n' } },
                { id: 'rule_19', name: 'Pawns Defended by Knights', enabled: true, category: 'pawn_structure', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'pawn', defenderType: 'knight', minDefenders: 1 }, value: { type: 'fixed', value: 30 } },
                { id: 'rule_19b', name: 'Pawns Defended by Bishops', enabled: true, category: 'pawn_structure', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'pawn', defenderType: 'bishop', minDefenders: 1 }, value: { type: 'fixed', value: 30 } },
                { id: 'rule_19c', name: 'Pawns Defended by Rooks', enabled: true, category: 'pawn_structure', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'pawn', defenderType: 'rook', minDefenders: 1 }, value: { type: 'fixed', value: 30 } },
                { id: 'rule_19d', name: 'Pawns Defended by Queens', enabled: true, category: 'pawn_structure', condition: { type: 'always' }, target: { type: 'defense', pieceType: 'pawn', defenderType: 'queen', minDefenders: 1 }, value: { type: 'fixed', value: 30 } },
                
                // === CASTLING (lines 189-212) - +100 if castled OR can castle ===
                { id: 'rule_20', name: 'Castled Bonus', enabled: true, category: 'king_safety', condition: { type: 'castling', player: 'my', status: 'has_castled_either' }, target: { type: 'global' }, value: { type: 'fixed', value: 100 } },
                { id: 'rule_21', name: 'Can Castle Bonus', enabled: true, category: 'king_safety', condition: { type: 'castling', player: 'my', status: 'can_still_castle' }, target: { type: 'global' }, value: { type: 'fixed', value: 100 } },
                
                // === CHECK BONUS (lines 40-43) - +50 for giving check ===
                { id: 'rule_22', name: 'Check Bonus', enabled: true, category: 'threats', condition: { type: 'always' }, target: { type: 'check' }, value: { type: 'fixed', value: 50 } }
            ],
            categoryWeights: { material: 1.0, mobility: 1.0, king_safety: 1.0, pawn_structure: 1.0, positional: 1.0, piece_coordination: 1.0, threats: 1.0 }
        };
    }
    
    createAggressiveTemplate() {
        return {
            name: 'Aggressive',
            description: 'Prioritizes attacks and mobility',
            rules: [
                { id: 'rule_1', name: 'Pawns', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'pawn' }, value: { type: 'fixed', value: 80 } },
                { id: 'rule_2', name: 'Knights', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'knight' }, value: { type: 'fixed', value: 350 } },
                { id: 'rule_3', name: 'Bishops', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'bishop' }, value: { type: 'fixed', value: 350 } },
                { id: 'rule_4', name: 'Rooks', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'rook' }, value: { type: 'fixed', value: 450 } },
                { id: 'rule_5', name: 'Queens', enabled: true, category: 'material', condition: { type: 'always' }, target: { type: 'simple_material', pieceType: 'queen' }, value: { type: 'fixed', value: 950 } },
                { id: 'rule_6', name: 'Knight Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'knight', captureWeight: 2.5 }, value: { type: 'formula', formula: '15 * n' } },
                { id: 'rule_7', name: 'Bishop Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'bishop', captureWeight: 2.5 }, value: { type: 'formula', formula: '15 * n' } },
                { id: 'rule_8', name: 'Rook Mobility', enabled: true, category: 'mobility', condition: { type: 'always' }, target: { type: 'mobility', pieceType: 'rook', captureWeight: 2.5 }, value: { type: 'formula', formula: '12 * n' } },
                { id: 'rule_9', name: 'Check Bonus', enabled: true, category: 'threats', condition: { type: 'always' }, target: { type: 'check' }, value: { type: 'fixed', value: 100 } },
                { id: 'rule_10', name: 'King Distance (Endgame)', enabled: true, category: 'positional', condition: { type: 'game_phase', phase: 'endgame' }, target: { type: 'piece_distance', piece1Type: 'king', piece1Color: 'my', piece2Type: 'king', piece2Color: 'opponent', distanceType: 'chebyshev' }, value: { type: 'formula', formula: '-10 * n' } }
            ],
            categoryWeights: { material: 0.8, mobility: 1.5, king_safety: 0.7, pawn_structure: 0.5, positional: 1.0, piece_coordination: 1.0, threats: 1.5 }
        };
    }
    
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.eval-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `eval-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Get current evaluator config for the engine
    getEvaluatorConfig() {
        return this.evaluator;
    }
    
    // Publish current eval to the leaderboard
    async publishToLeaderboard() {
        if (this.evaluator.rules.length === 0) {
            this.showNotification('Add some rules before publishing!', 'error');
            return;
        }
        
        const name = prompt('Enter a name for your eval:', this.evaluator.name);
        if (!name) return;
        
        const author = prompt('Your name (leave empty for Anonymous):', '') || 'Anonymous';
        
        try {
            const response = await fetch('http://localhost:3001/api/evals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    author,
                    description: this.evaluator.description || '',
                    eval_config: this.evaluator,
                    is_public: true
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Published! ELO calculation will begin shortly.', 'success');
                
                // Switch to leaderboard tab
                setTimeout(() => {
                    document.querySelector('[data-tab="leaderboard-tab"]')?.click();
                }, 1500);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Publish failed:', error);
            this.showNotification(`Failed to publish: ${error.message}. Is the server running?`, 'error');
        }
    }
}

// Export for use in tabs
// Note: Initialization happens in index.html when the Eval Builder tab is opened
window.EvalBuilder = EvalBuilder;
