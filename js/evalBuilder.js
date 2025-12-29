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
                    description: 'This rule applies on every move regardless of game state',
                    icon: 'check',
                    params: [],
                    sentence: ['Always apply this rule']
                },
                game_phase: {
                    id: 'game_phase',
                    name: 'Game Phase',
                    description: 'Only apply this rule during a specific phase of the game',
                    icon: 'clock',
                    params: [
                        { name: 'phase', type: 'select', options: ['opening', 'middlegame', 'endgame', 'late endgame'], optionValues: ['opening', 'middlegame', 'endgame', 'late_endgame'], label: 'Phase' }
                    ],
                    sentence: ['Only during the', { param: 'phase' }, 'phase']
                },
                material: {
                    id: 'material',
                    name: 'Material Count',
                    description: 'Apply when a player has a certain number of pieces',
                    icon: 'hash',
                    params: [
                        { name: 'player', type: 'select', options: ['I', 'opponent', 'either player'], optionValues: ['my', 'opponent', 'both'], label: 'Player' },
                        { name: 'comparison', type: 'select', options: ['have at least', 'have at most', 'have exactly', 'have more than', 'have fewer than'], optionValues: ['at_least', 'at_most', 'exactly', 'more_than', 'less_than'], label: 'Compare' },
                        { name: 'count', type: 'number', min: 0, max: 10, label: 'Count', default: 1 },
                        { name: 'pieceType', type: 'select', options: ['pieces', 'pawns', 'knights', 'bishops', 'rooks', 'queens'], optionValues: ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'Piece' }
                    ],
                    sentence: ['When', { param: 'player' }, { param: 'comparison' }, { param: 'count' }, { param: 'pieceType' }]
                },
                castling: {
                    id: 'castling',
                    name: 'Castling Status',
                    description: 'Apply based on whether a player has castled',
                    icon: 'castle',
                    params: [
                        { name: 'player', type: 'select', options: ['I', 'opponent'], optionValues: ['my', 'opponent'], label: 'Player' },
                        { name: 'status', type: 'select', options: ['have castled', 'castled kingside', 'castled queenside', 'have not castled', 'can still castle', 'cannot castle'], optionValues: ['has_castled_either', 'has_castled_kingside', 'has_castled_queenside', 'has_not_castled', 'can_still_castle', 'cannot_castle'], label: 'Status' }
                    ],
                    sentence: ['When', { param: 'player' }, { param: 'status' }]
                },
                piece_distance: {
                    id: 'piece_distance',
                    name: 'Piece Distance',
                    description: 'Apply when two pieces are within a certain distance',
                    icon: 'move-horizontal',
                    params: [
                        { name: 'piece1Color', type: 'select', options: ['my', 'opponent\'s'], optionValues: ['my', 'opponent'], label: 'Owner 1' },
                        { name: 'piece1Type', type: 'select', options: ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 1' },
                        { name: 'comparison', type: 'select', options: ['is within', 'is exactly', 'is more than'], optionValues: ['less_equal', 'exactly', 'greater_than'], label: 'Compare' },
                        { name: 'distance', type: 'number', min: 1, max: 14, label: 'Distance', default: 3 },
                        { name: 'piece2Color', type: 'select', options: ['my', 'opponent\'s'], optionValues: ['my', 'opponent'], label: 'Owner 2' },
                        { name: 'piece2Type', type: 'select', options: ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 2' }
                    ],
                    sentence: ['When', { param: 'piece1Color' }, { param: 'piece1Type' }, { param: 'comparison' }, { param: 'distance' }, 'squares of', { param: 'piece2Color' }, { param: 'piece2Type' }]
                }
            },
            targets: {
                simple_material: {
                    id: 'simple_material',
                    name: 'Count Pieces',
                    description: 'Award points for each piece of a type you control',
                    icon: 'boxes',
                    category: 'material',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'Piece' }
                    ],
                    sentence: ['For each', { param: 'pieceType' }, 'I have, award']
                },
                mobility: {
                    id: 'mobility',
                    name: 'Piece Mobility',
                    description: 'Reward pieces that have many legal moves available',
                    icon: 'move-diagonal',
                    category: 'mobility',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['any piece', 'knight', 'bishop', 'rook', 'queen', 'king'], optionValues: ['any', 'knight', 'bishop', 'rook', 'queen', 'king'], label: 'Piece' }
                    ],
                    sentence: ['For each legal move my', { param: 'pieceType' }, 'can make, award']
                },
                defense: {
                    id: 'defense',
                    name: 'Defended Pieces',
                    description: 'Reward pieces that are protected by friendly pieces',
                    icon: 'shield',
                    category: 'piece_coordination',
                    params: [
                        { name: 'pieceType', type: 'select', options: ['any piece', 'knight', 'bishop', 'rook', 'queen'], optionValues: ['any', 'knight', 'bishop', 'rook', 'queen'], label: 'Defended' },
                        { name: 'defenderType', type: 'select', options: ['any piece', 'pawn', 'knight', 'bishop', 'rook', 'queen'], optionValues: ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen'], label: 'By' },
                        { name: 'minDefenders', type: 'number', min: 1, max: 5, label: 'Min', default: 1 }
                    ],
                    sentence: ['For each', { param: 'pieceType' }, 'defended by', { param: 'defenderType' }, '(at least', { param: 'minDefenders' }, 'times), award']
                },
                piece_distance: {
                    id: 'piece_distance',
                    name: 'Piece Distance',
                    description: 'Score based on how close or far pieces are from each other',
                    icon: 'ruler',
                    category: 'positional',
                    params: [
                        { name: 'piece1Color', type: 'select', options: ['my', 'opponent\'s'], optionValues: ['my', 'opponent'], label: 'Owner 1' },
                        { name: 'piece1Type', type: 'select', options: ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 1' },
                        { name: 'piece2Color', type: 'select', options: ['my', 'opponent\'s'], optionValues: ['my', 'opponent'], label: 'Owner 2' },
                        { name: 'piece2Type', type: 'select', options: ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'], label: 'Piece 2' }
                    ],
                    sentence: ['For the distance between', { param: 'piece1Color' }, { param: 'piece1Type' }, 'and', { param: 'piece2Color' }, { param: 'piece2Type' }, ', award']
                },
                pawn_advancement: {
                    id: 'pawn_advancement',
                    name: 'Pawn Advancement',
                    description: 'Reward pawns that have pushed forward toward promotion',
                    icon: 'arrow-up',
                    category: 'pawn_structure',
                    params: [],
                    sentence: ['For each rank my pawns have advanced, award']
                },
                king_safety: {
                    id: 'king_safety',
                    name: 'King Safety',
                    description: 'Penalize positions where the king is under attack',
                    icon: 'shield-alert',
                    category: 'king_safety',
                    params: [],
                    sentence: ['For each enemy attack near my king, award']
                },
                check: {
                    id: 'check',
                    name: 'Giving Check',
                    description: 'Bonus when you are giving check to the opponent',
                    icon: 'zap',
                    category: 'threats',
                    params: [],
                    sentence: ['When I am giving check, award']
                },
                global: {
                    id: 'global',
                    name: 'Position Bonus',
                    description: 'A flat bonus that applies when the condition is met',
                    icon: 'globe',
                    category: 'positional',
                    params: [],
                    sentence: ['Award a flat bonus of']
                }
            },
            values: {
                fixed: {
                    id: 'fixed',
                    name: 'Fixed Value',
                    description: 'Award a fixed number of centipawns',
                    icon: 'equal',
                    params: [
                        { name: 'value', type: 'number', min: -1000, max: 1000, label: 'cp', default: 100 }
                    ],
                    sentence: [{ param: 'value' }, 'centipawns']
                },
                formula: {
                    id: 'formula',
                    name: 'Custom Formula',
                    description: 'Use a formula where n = the count from target',
                    icon: 'function-square',
                    params: [
                        { name: 'formula', type: 'formula', label: 'Formula', placeholder: '10 * sqrt(n)', default: 'n * 10' }
                    ],
                    sentence: ['f(n) =', { param: 'formula' }, 'centipawns']
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
        
        // Use shared content renderer with preview=true (disabled fields)
        const content = this.renderBlockContent(block, type, { preview: true });
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
    
    selectBlock(block, type) {
        // Add block to current rule builder
        const slotEl = document.getElementById(`rule-${type}-slot`);
        this.setSlotContent(slotEl, block, type);
    }
    
    setSlotContent(slotEl, block, type) {
        slotEl.innerHTML = '';
        slotEl.classList.remove('empty', 'required');
        slotEl.dataset.blockId = block.id;
        
        // Use shared content renderer with preview=false (active fields)
        const content = this.renderBlockContent(block, type, { 
            preview: false, 
            onRemove: () => this.clearSlot(slotEl, type) 
        });
        slotEl.appendChild(content);
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    /**
     * Shared block content renderer - single source of truth for both bank and slot tiles
     * @param {Object} block - The block definition
     * @param {string} type - Block type (condition, target, value)
     * @param {Object} options - { preview: boolean, onRemove: function }
     *   - preview: true = greyed out fields (bank), false = active fields (slot)
     *   - onRemove: callback for remove button (only shown if provided)
     */
    renderBlockContent(block, type, options = {}) {
        const { preview = false, onRemove = null } = options;
        
        const content = document.createElement('div');
        content.className = `block-content${preview ? ' preview' : ' active'}`;
        
        // Header with icon and name
        const header = document.createElement('div');
        header.className = 'block-header';
        header.innerHTML = `
            <span class="block-icon"><i data-lucide="${block.icon}"></i></span>
            <span class="block-name">${block.name}</span>
        `;
        content.appendChild(header);
        
        // Remove button (only for active/slot mode)
        if (onRemove) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'block-remove';
            removeBtn.title = 'Remove';
            removeBtn.innerHTML = '<i data-lucide="x"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onRemove();
            });
            content.appendChild(removeBtn);
        }
        
        // Show sentence layout for blocks with params, or description for simple blocks
        if (block.sentence && block.params && block.params.length > 0) {
            // Blocks with params: show interactive sentence
            const sentenceEl = this.renderSentence(block, preview);
            content.appendChild(sentenceEl);
        } else if (block.sentence && !preview) {
            // Active slot with no-param block: show sentence as text
            const sentenceEl = this.renderSentence(block, preview);
            content.appendChild(sentenceEl);
        } else if (block.description) {
            // Preview mode or fallback: show description
            const desc = document.createElement('div');
            desc.className = 'block-desc';
            desc.textContent = block.description;
            content.appendChild(desc);
        }
        
        return content;
    }
    
    /**
     * Render a semantic sentence with inline dropdowns
     */
    renderSentence(block, preview = false) {
        const sentenceEl = document.createElement('div');
        sentenceEl.className = `block-sentence${preview ? ' preview' : ''}`;
        
        // Build param lookup
        const paramMap = {};
        block.params.forEach(p => paramMap[p.name] = p);
        
        block.sentence.forEach(part => {
            if (typeof part === 'string') {
                // Static text
                const span = document.createElement('span');
                span.className = 'sentence-text';
                span.textContent = part;
                sentenceEl.appendChild(span);
            } else if (part.param) {
                // Parameter dropdown or input
                const param = paramMap[part.param];
                if (param) {
                    const wrapper = document.createElement('span');
                    wrapper.className = 'sentence-input-wrap';
                    
                    // Pass part options (suffix, pluralize, etc.)
                    const input = this.createInlineInput(param, preview, {
                        suffix: part.suffix || '',
                        pluralize: part.pluralize || false
                    });
                    wrapper.appendChild(input);
                    sentenceEl.appendChild(wrapper);
                }
            }
        });
        
        return sentenceEl;
    }
    
    /**
     * Create an inline input for sentence layout
     */
    createInlineInput(param, disabled = false, partOptions = {}) {
        const { suffix = '', pluralize = false } = partOptions;
        let input;
        
        if (param.type === 'select') {
            input = document.createElement('select');
            input.disabled = disabled;
            input.className = 'sentence-select param-input'; // Include param-input for getSlotData
            
            if (disabled) {
                // Preview mode - show placeholder
                const option = document.createElement('option');
                option.textContent = '—';
                input.appendChild(option);
            } else {
                // Active mode - show all options
                const displayOptions = param.options;
                const valueOptions = param.optionValues || param.options;
                
                // Determine context for better display - piece-related params get 'piece' context
                const isPieceParam = param.name.toLowerCase().includes('piece') || param.name.toLowerCase().includes('type');
                const formatContext = isPieceParam ? 'piece' : null;
                
                displayOptions.forEach((opt, idx) => {
                    const option = document.createElement('option');
                    option.value = valueOptions[idx];
                    // Smart formatting with context
                    let displayText = this.formatOption(opt, formatContext);
                    // Pluralize piece types (but not "piece" itself or already plural)
                    if (pluralize && opt !== 'any' && !opt.endsWith('s') && displayText !== 'piece') {
                        displayText += 's';
                    } else if (pluralize && opt === 'any') {
                        displayText = 'pieces'; // "any" pluralizes to "pieces"
                    }
                    option.textContent = displayText + suffix;
                    input.appendChild(option);
                });
            }
        } else if (param.type === 'formula') {
            input = document.createElement('input');
            input.type = 'text';
            input.disabled = disabled;
            input.className = 'sentence-formula param-input';
            input.placeholder = param.placeholder || 'n * 10';
            input.value = disabled ? '' : (param.default || 'n * 10');
            input.name = param.name;
            
            if (!disabled) {
                // Add validation on input
                input.addEventListener('input', () => {
                    const result = this.validateFormula(input.value);
                    if (result.valid) {
                        input.classList.remove('invalid');
                        input.title = `Preview: n=4 → ${result.preview}`;
                    } else {
                        input.classList.add('invalid');
                        input.title = result.error;
                    }
                });
                // Trigger initial validation
                setTimeout(() => input.dispatchEvent(new Event('input')), 0);
            }
            
            return input;
        } else {
            // Number input
            input = document.createElement('input');
            input.type = 'number';
            input.disabled = disabled;
            input.className = 'sentence-number param-input';
            if (disabled) {
                input.placeholder = '—';
                input.style.width = '2.5em';
            } else {
                input.min = param.min ?? -1000;
                input.max = param.max ?? 1000;
                input.step = param.step ?? 1;
                input.value = param.default ?? (param.min ?? 0);
                // Dynamic width based on value range
                const maxDigits = Math.max(String(param.min ?? 0).length, String(param.max ?? 100).length);
                input.style.width = `${maxDigits + 1.5}em`;
            }
        }
        
        input.name = param.name;
        return input;
    }
    
    /**
     * Create a parameter input row
     * @param {Object} param - The parameter definition
     * @param {boolean} disabled - Whether the input should be disabled (preview mode)
     */
    createParamInput(param, disabled = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `param-row${disabled ? ' disabled' : ''}`;
        
        // Label
        const label = document.createElement('label');
        label.textContent = param.label;
        wrapper.appendChild(label);
        
        let input;
        if (param.type === 'select') {
            input = document.createElement('select');
            input.disabled = disabled;
            if (disabled) {
                // Preview mode - show placeholder
                const option = document.createElement('option');
                option.textContent = '—';
                input.appendChild(option);
            } else {
                // Active mode - show all options
                param.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = this.formatOption(opt);
                    input.appendChild(option);
                });
            }
        } else if (param.type === 'formula') {
            if (disabled) {
                // Preview mode - simple disabled input
                input = document.createElement('input');
                input.type = 'text';
                input.disabled = true;
                input.placeholder = 'formula';
                input.className = 'param-input formula-input';
            } else {
                // Active mode - formula input with validation
                const formulaWrapper = document.createElement('div');
                formulaWrapper.className = 'formula-input-wrapper';
                
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
                
                document.addEventListener('click', () => {
                    tooltip.classList.remove('visible');
                });
                
                inputRow.appendChild(input);
                inputRow.appendChild(infoBtn);
                inputRow.appendChild(tooltip);
                
                const validationMsg = document.createElement('div');
                validationMsg.className = 'formula-validation';
                
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
                
                setTimeout(() => {
                    input.dispatchEvent(new Event('input'));
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }, 0);
                
                formulaWrapper.appendChild(inputRow);
                formulaWrapper.appendChild(validationMsg);
                wrapper.appendChild(formulaWrapper);
                return wrapper;
            }
        } else {
            // Number input
            input = document.createElement('input');
            input.type = 'number';
            input.disabled = disabled;
            if (disabled) {
                input.placeholder = '—';
            } else {
                input.min = param.min ?? -1000;
                input.max = param.max ?? 1000;
                input.step = param.step ?? 1;
                input.value = param.default ?? (param.min ?? 0);
            }
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
    
    formatOption(opt, context = null) {
        // Special display mappings for more natural language
        const displayMap = {
            'any': context === 'piece' ? 'piece' : 'any',
            'my': 'My',
            'opponent': 'opponent\'s',
            'both': 'either',
            'manhattan': 'Manhattan',
            'chebyshev': 'Chebyshev'
        };
        
        if (displayMap[opt]) {
            return displayMap[opt];
        }
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
            listEl.innerHTML = '<div class="empty-rules">No rules yet. Create one above!</div>';
            return;
        }
        
        // Render rule cards in grid
        this.evaluator.rules.forEach((rule, index) => {
            const ruleEl = document.createElement('div');
            ruleEl.className = `rule-item ${rule.enabled ? 'enabled' : 'disabled'}`;
            ruleEl.dataset.ruleId = rule.id;
            ruleEl.dataset.index = index + 1;
            ruleEl.dataset.category = rule.category || 'positional';
            
            // Card header with name and number
            const headerEl = document.createElement('div');
            headerEl.className = 'rule-card-header';
            
            const nameEl = document.createElement('span');
            nameEl.className = 'rule-name';
            nameEl.textContent = rule.name || `Rule ${index + 1}`;
            headerEl.appendChild(nameEl);
            
            const numEl = document.createElement('span');
            numEl.className = 'rule-number';
            numEl.textContent = `#${index + 1}`;
            headerEl.appendChild(numEl);
            
            ruleEl.appendChild(headerEl);
            
            // Rule description/preview
            const descEl = document.createElement('div');
            descEl.className = 'rule-desc';
            descEl.innerHTML = this.getRulePreview(rule);
            ruleEl.appendChild(descEl);
            
            // Action buttons (visible on hover)
            const actionsEl = document.createElement('div');
            actionsEl.className = 'rule-actions';
            actionsEl.innerHTML = `
                <button class="edit-btn" title="Edit"><i data-lucide="pencil"></i></button>
                <button class="delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
            `;
            ruleEl.appendChild(actionsEl);
            
            // Click to toggle enabled state
            ruleEl.addEventListener('click', (e) => {
                if (!e.target.closest('.rule-actions')) {
                    rule.enabled = !rule.enabled;
                    ruleEl.classList.toggle('enabled', rule.enabled);
                    ruleEl.classList.toggle('disabled', !rule.enabled);
                    this.saveToStorage();
                    this.renderRulesList(); // Re-render to update count
                }
            });
            
            listEl.appendChild(ruleEl);
            
            // Bind action buttons after appending
            actionsEl.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editRule(rule);
            });
            
            actionsEl.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRule(rule.id);
            });
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
    
    getRuleAbbrev(rule) {
        // Generate a short abbreviation based on target type
        if (!rule.target) return '???';
        
        let abbrev = '';
        const targetType = rule.target.type;
        
        switch (targetType) {
            case 'simple_material':
                abbrev = rule.target.pieceType ? this.getPieceAbbrev(rule.target.pieceType) : 'Mat';
                break;
            case 'mobility':
                abbrev = rule.target.pieceType ? `${this.getPieceAbbrev(rule.target.pieceType)}Mob` : 'Mob';
                break;
            case 'defense':
                abbrev = rule.target.pieceType ? `Def${this.getPieceAbbrev(rule.target.pieceType)}` : 'Def';
                break;
            case 'piece_distance':
                abbrev = 'Dist';
                break;
            case 'pawn_advancement':
                abbrev = 'PwnAdv';
                break;
            case 'pawn_neighbors':
                abbrev = 'PwnNbr';
                break;
            case 'check':
                abbrev = 'Check';
                break;
            case 'global':
                abbrev = 'Bonus';
                break;
            case 'king_safety':
                abbrev = 'KSafe';
                break;
            default:
                // For unknown types, create a readable abbreviation
                abbrev = targetType
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1, 3))
                    .join('')
                    .substring(0, 6);
        }
        
        // Add condition hint if not "always"
        if (rule.condition && rule.condition.type !== 'always') {
            const condAbbrevs = {
                'game_phase': this.getPhaseAbbrev(rule.condition.phase),
                'material': 'Mat',
                'castling': 'Cast',
                'piece_distance': 'Dist'
            };
            const condHint = condAbbrevs[rule.condition.type] || '';
            if (condHint) {
                abbrev = `${condHint}:${abbrev}`;
            }
        }
        
        return abbrev;
    }
    
    getPieceAbbrev(pieceType) {
        const abbrevs = {
            'pawn': 'P',
            'knight': 'N',
            'bishop': 'B',
            'rook': 'R',
            'queen': 'Q',
            'king': 'K',
            'any': 'All'
        };
        return abbrevs[pieceType] || pieceType.charAt(0).toUpperCase();
    }
    
    getPhaseAbbrev(phase) {
        const abbrevs = {
            'opening': 'Op',
            'middlegame': 'Mid',
            'endgame': 'End',
            'late_endgame': 'Late'
        };
        return abbrevs[phase] || '';
    }
    
    getRuleValueShort(rule) {
        if (!rule.value) return '';
        
        if (rule.value.type === 'fixed') {
            const val = rule.value.baseValue || 0;
            return val >= 0 ? `+${val}` : `${val}`;
        } else if (rule.value.type === 'scaled') {
            return `×${rule.value.multiplier || 1}`;
        } else if (rule.value.type === 'conditional') {
            return 'Cond';
        }
        return '';
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
        if (!container) return;
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
        // Scroll within the block catalog panel only, not the whole page
        const section = document.getElementById(`${type}-blocks`);
        const catalog = document.querySelector('.block-catalog');
        
        if (catalog && section) {
            // Calculate the offset within the catalog
            const catalogRect = catalog.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            const scrollOffset = sectionRect.top - catalogRect.top + catalog.scrollTop - 20;
            
            catalog.scrollTo({
                top: scrollOffset,
                behavior: 'smooth'
            });
        }
        
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
        
        // Determine if we're editing
        const isEditing = this.editingRule !== null;
        
        // Build rule
        const rule = {
            id: isEditing ? this.editingRule.id : `rule_${this.nextRuleId++}`,
            name: nameInput.value || 'Unnamed Rule',
            enabled: isEditing ? this.editingRule.enabled : true,  // Preserve enabled state when editing
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
        if (isEditing) {
            const index = this.evaluator.rules.findIndex(r => r.id === this.editingRule.id);
            if (index >= 0) {
                this.evaluator.rules[index] = rule;
            }
        } else {
            this.evaluator.rules.push(rule);
        }
        
        this.renderRulesList();
        this.clearBuilder();
        this.saveToStorage();
        this.showNotification(isEditing ? 'Rule updated successfully!' : 'Rule added successfully!', 'success');
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
        
        // Update UI to show edit mode
        const addBtn = document.getElementById('add-rule-btn');
        const builder = document.querySelector('.rule-builder');
        addBtn.innerHTML = '<i data-lucide="check"></i> Update Rule';
        addBtn.classList.add('edit-mode');
        builder.classList.add('edit-mode');
        
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
        
        // Reinitialize Lucide icons for the button
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
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
        
        // Reset button and builder from edit mode
        const addBtn = document.getElementById('add-rule-btn');
        const builder = document.querySelector('.rule-builder');
        addBtn.innerHTML = '<i data-lucide="plus"></i> Add Rule';
        addBtn.classList.remove('edit-mode');
        builder.classList.remove('edit-mode');
        
        // Reinitialize Lucide icons for the button
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
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
