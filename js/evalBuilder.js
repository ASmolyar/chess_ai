/**
 * Evaluation Function Builder
 * UI for creating custom chess evaluation functions using building blocks
 */

class EvalBuilder {
    constructor() {
        // Default to empty evaluator
        this.evaluator = this.createEmptyEvaluator();
        
        this.editingRule = null;
        this.nextRuleId = 1;
        
        // Building blocks catalog
        this.catalog = this.createCatalog();
        
        // Classic evaluation presets
        this.presets = this.createPresetsCatalog();
    }
    
    createEmptyEvaluator() {
        return {
      name: "My Custom Evaluator",
      description: "Custom evaluation function",
            rules: [],
            categoryWeights: {
                material: 1.0,
                mobility: 1.0,
                king_safety: 1.0,
                pawn_structure: 1.0,
                positional: 1.0,
                piece_coordination: 1.0,
        threats: 1.0,
      },
        };
    }
    
    createPresetsCatalog() {
        return {
            // ═══════════════════════════════════════════════════════════════════
            // SHANNON'S EVALUATION (1950)
            // From Claude Shannon's seminal paper "Programming a Computer for Playing Chess"
            // The foundational chess evaluation function that established the field
            // ═══════════════════════════════════════════════════════════════════
            shannon: {
                id: "shannon",
                name: "Shannon (1950)",
                author: "Claude Shannon",
                year: 1950,
                description: "The foundational evaluation from Shannon's 'Programming a Computer for Playing Chess'. Uses material, pawn structure penalties, and mobility.",
                icon: "book-open",
                evaluator: this.createShannonPreset(),
            },
            
            // ═══════════════════════════════════════════════════════════════════
            // TURING'S TUROCHAMP (1948)
            // Alan Turing & David Champernowne's historic evaluation
            // First chess algorithm ever designed, executed by hand
            // ═══════════════════════════════════════════════════════════════════
            turing: {
                id: "turing",
                name: "Turochamp (1948)",
                author: "Alan Turing & David Champernowne",
                year: 1948,
                description: "The original chess engine evaluation. Features sqrt mobility scaling, piece defense bonuses, king safety, and castling rewards.",
                icon: "cpu",
                evaluator: this.createTuringTemplate(),
            },
            
            // ═══════════════════════════════════════════════════════════════════
            // SOMA EVALUATION (1960s)
            // Early practical evaluation emphasizing center control
            // ═══════════════════════════════════════════════════════════════════
            soma: {
                id: "soma",
                name: "SOMA (1960s)",
                author: "Various",
                year: 1960,
                description: "Early practical evaluation emphasizing center control, material balance, and basic positional concepts.",
                icon: "target",
                evaluator: this.createSOMAPreset(),
            },
            
            // ═══════════════════════════════════════════════════════════════════
            // SIMPLIFIED EVALUATION (Kaufman/Michniewski)
            // Modern hand-crafted baseline with piece-square tables
            // Used as reference by many engines
            // ═══════════════════════════════════════════════════════════════════
            simplified: {
                id: "simplified",
                name: "Simplified (1990s)",
                author: "Tomasz Michniewski",
                year: 1995,
                description: "Modern hand-crafted baseline with piece-square tables, bishop pair bonus, and phase-based king positioning.",
                icon: "layout-grid",
                evaluator: this.createSimplifiedPreset(),
            },
            
            // ═══════════════════════════════════════════════════════════════════
            // FRUIT-STYLE EVALUATION (2005)
            // Fabien Letouzey's revolutionary open-source approach
            // First open-source engine to reach 2800+ Elo
            // ═══════════════════════════════════════════════════════════════════
            fruit: {
                id: "fruit",
                name: "Fruit-Style (2005)",
                author: "Fabien Letouzey",
                year: 2005,
                description: "Revolutionary evaluation with king safety attack units, passed pawn bonuses, mobility per piece type, and space advantage.",
                icon: "apple",
                evaluator: this.createFruitPreset(),
            },
            
        };
    }
    
    createCatalog() {
        return {
          conditions: {
            always: {
              id: "always",
              name: "Always Apply",
              description:
                "This rule applies on every move regardless of game state",
              icon: "check",
              params: [],
              sentence: ["Always apply this rule"],
            },
            game_phase: {
              id: "game_phase",
              name: "Game Phase",
              description:
                "Only apply this rule during a specific phase of the game",
              icon: "clock",
              params: [
                {
                  name: "phase",
                  type: "select",
                  options: ["opening", "middlegame", "endgame", "late endgame"],
                  optionValues: [
                    "opening",
                    "middlegame",
                    "endgame",
                    "late_endgame",
                  ],
                  label: "Phase",
                },
              ],
              sentence: ["Only during the", { param: "phase" }, "phase"],
            },
            material: {
              id: "material",
              name: "Material Count",
              description: "Apply based on the number of a specific piece type",
              icon: "hash",
              params: [
                {
                  name: "player",
                  type: "select",
                  options: ["I", "opponent"],
                  optionValues: ["my", "opponent"],
                  label: "Player",
                },
                {
                  name: "comparison",
                  type: "select",
                  options: ["have ≥", "have ≤", "have exactly"],
                  optionValues: ["at_least", "at_most", "exactly"],
                  label: "Compare",
                },
                {
                  name: "count",
                  type: "number",
                  min: 0,
                  max: 8,
                  label: "Count",
                  default: 1,
                },
                {
                  name: "pieceType",
                  type: "select",
                  options: ["minor pieces", "pawns", "rooks", "queens"],
                  optionValues: ["minor", "pawn", "rook", "queen"],
                  label: "Piece",
                },
              ],
              sentence: [
                "When",
                { param: "player" },
                { param: "comparison" },
                { param: "count" },
                { param: "pieceType" },
              ],
            },
            castling: {
              id: "castling",
              name: "Castling Status",
              description: "Apply based on whether a player has castled",
              icon: "landmark",
              params: [
                {
                  name: "player",
                  type: "select",
                  options: ["I", "opponent"],
                  optionValues: ["my", "opponent"],
                  label: "Player",
                },
                {
                  name: "status",
                  type: "select",
                  options: [
                    "have castled",
                    "castled kingside",
                    "castled queenside",
                    "have not castled",
                    "can still castle",
                    "cannot castle",
                  ],
                  optionValues: [
                    "has_castled_either",
                    "has_castled_kingside",
                    "has_castled_queenside",
                    "has_not_castled",
                    "can_still_castle",
                    "cannot_castle",
                  ],
                  label: "Status",
                },
              ],
              sentence: ["When", { param: "player" }, { param: "status" }],
            },
            piece_distance: {
              id: "piece_distance",
              name: "Piece Distance",
              description:
                "Apply when two pieces are within a certain distance of each other",
              icon: "move-horizontal",
              params: [
                {
                  name: "piece1Type",
                  type: "select",
                  options: [
                    "my king",
                    "my queen",
                    "my rook",
                    "opponent's king",
                    "opponent's queen",
                  ],
                  optionValues: [
                    "my_king",
                    "my_queen",
                    "my_rook",
                    "opp_king",
                    "opp_queen",
                  ],
                  label: "Piece 1",
                },
                {
                  name: "comparison",
                  type: "select",
                  options: ["within", "exactly", "more than"],
                  optionValues: ["less_equal", "exactly", "greater_than"],
                  label: "Compare",
                },
                {
                  name: "distance",
                  type: "number",
                  min: 1,
                  max: 8,
                  label: "Distance",
                  default: 3,
                },
                {
                  name: "piece2Type",
                  type: "select",
                  options: ["their king", "any piece", "any pawn"],
                  optionValues: ["opp_king", "any", "pawn"],
                  label: "Piece 2",
                },
              ],
              sentence: [
                "When",
                { param: "piece1Type" },
                "is",
                { param: "comparison" },
                { param: "distance" },
                "squares of",
                { param: "piece2Type" },
              ],
            },
            has_passed: {
              id: "has_passed",
              name: "Has Passed Pawn",
              description: "Apply when a player has passed pawns",
              icon: "arrow-up-right",
              params: [
                {
                  name: "player",
                  type: "select",
                  options: ["I", "opponent"],
                  optionValues: ["my", "opponent"],
                  label: "Player",
                },
                {
                  name: "requirement",
                  type: "select",
                  options: [
                    "have any passed pawn",
                    "have no passed pawns",
                    "have multiple passed pawns",
                  ],
                  optionValues: ["any", "none", "multiple"],
                  label: "Requirement",
                },
              ],
              sentence: ["When", { param: "player" }, { param: "requirement" }],
            },
            piece_on_square: {
              id: "piece_on_square",
              name: "Piece on Square",
          description: "Apply when a specific piece is on a specific square",
              icon: "map-pin",
              params: [
                {
                  name: "player",
                  type: "select",
                  options: ["my", "opponent's"],
                  optionValues: ["my", "opponent"],
                  label: "Owner",
                },
                {
                  name: "pieceType",
                  type: "select",
              options: ["pawn", "knight", "bishop", "rook", "queen", "king"],
                  label: "Piece",
                },
                {
                  name: "square",
                  type: "select",
                  options: [
                    "a1",
                    "a2",
                    "a3",
                    "a4",
                    "a5",
                    "a6",
                    "a7",
                    "a8",
                    "b1",
                    "b2",
                    "b3",
                    "b4",
                    "b5",
                    "b6",
                    "b7",
                    "b8",
                    "c1",
                    "c2",
                    "c3",
                    "c4",
                    "c5",
                    "c6",
                    "c7",
                    "c8",
                    "d1",
                    "d2",
                    "d3",
                    "d4",
                    "d5",
                    "d6",
                    "d7",
                    "d8",
                    "e1",
                    "e2",
                    "e3",
                    "e4",
                    "e5",
                    "e6",
                    "e7",
                    "e8",
                    "f1",
                    "f2",
                    "f3",
                    "f4",
                    "f5",
                    "f6",
                    "f7",
                    "f8",
                    "g1",
                    "g2",
                    "g3",
                    "g4",
                    "g5",
                    "g6",
                    "g7",
                    "g8",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "h7",
                    "h8",
                  ],
                  label: "Square",
                },
              ],
              sentence: [
                "When",
                { param: "player" },
                { param: "pieceType" },
                "is on",
                { param: "square" },
              ],
            },
            file_state: {
              id: "file_state",
              name: "File State",
              description: "Apply when a file is open, semi-open, or closed",
              icon: "columns",
              params: [
                {
                  name: "file",
                  type: "select",
                  options: [
                    "a-file",
                    "b-file",
                    "c-file",
                    "d-file",
                    "e-file",
                    "f-file",
                    "g-file",
                    "h-file",
                  ],
                  optionValues: ["a", "b", "c", "d", "e", "f", "g", "h"],
                  label: "File",
                },
                {
                  name: "state",
                  type: "select",
                  options: ["is open", "is semi-open", "is closed"],
                  optionValues: ["open", "semi_open", "closed"],
                  label: "State",
                },
                {
                  name: "player",
                  type: "select",
                  options: ["for me", "for opponent"],
                  optionValues: ["my", "opponent"],
                  label: "For",
                },
              ],
              sentence: [
                "When the",
                { param: "file" },
                { param: "state" },
                { param: "player" },
              ],
            },
            developed: {
              id: "developed",
              name: "Development Status",
              description: "Apply when pieces have moved from starting squares",
              icon: "arrow-right-circle",
              params: [
                {
                  name: "player",
                  type: "select",
                  options: ["my", "opponent's"],
                  optionValues: ["my", "opponent"],
                  label: "Owner",
                },
                {
                  name: "requirement",
                  type: "select",
                  options: [
                    "all minors developed",
                    "most minors developed",
                    "some developed",
                    "undeveloped",
                    "knights developed",
                    "bishops developed",
                  ],
                  optionValues: [
                    "fully",
                    "mostly",
                    "some",
                    "undeveloped",
                    "knights",
                    "bishops",
                  ],
                  label: "Status",
                },
              ],
              sentence: [
                "When",
                { param: "player" },
                "pieces are",
                { param: "requirement" },
              ],
            },
          },
          targets: {
            // CONSOLIDATED: piece_count absorbs simple_material + bishop_pair
            piece_count: {
              id: "piece_count",
              name: "Piece Count",
              description: "Award points for pieces or pairs you control",
              icon: "boxes",
              category: "material",
              specialRenderer: "piece_selector",
              params: [
                {
                  name: "pieceType",
                  type: "piece-select",
                  options: [
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                    "knight_pair",
                    "bishop_pair",
                    "rook_pair",
                  ],
                  optionValues: [
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                    "knight_pair",
                    "bishop_pair",
                    "rook_pair",
                  ],
                  label: "Piece",
                },
              ],
              sentence: ["For each", { param: "pieceType" }, "I have, award"],
            },
            // Legacy alias for backwards compatibility with templates
            simple_material: {
              id: "simple_material",
              name: "Count Pieces",
              description: "Award points for each piece of a type you control",
              icon: "boxes",
              category: "material",
              specialRenderer: "piece_selector",
              hidden: true, // Hide from sidebar, but keep for template compatibility
              params: [
                {
                  name: "pieceType",
                  type: "piece-select",
                  options: ["pawn", "knight", "bishop", "rook", "queen"],
                  optionValues: ["pawn", "knight", "bishop", "rook", "queen"],
                  label: "Piece",
                },
              ],
              sentence: ["For each", { param: "pieceType" }, "I have, award"],
            },
            mobility: {
              id: "mobility",
              name: "Count Moves",
              description: "Count legal moves, captures, or checks for your pieces",
              icon: "move-diagonal",
              category: "mobility",
              specialRenderer: "mobility",
              params: [
                {
                  name: "moveType",
                  type: "select",
                  options: ["move", "capture", "check"],
                  optionValues: ["move", "capture", "check"],
                  label: "Count",
                },
                {
                  name: "pieceType",
                  type: "piece-select",
                  options: ["pawn", "knight", "bishop", "rook", "queen", "king"],
                  optionValues: ["pawn", "knight", "bishop", "rook", "queen", "king"],
                  label: "Piece",
                },
              ],
              sentence: [
                "For each",
                { param: "moveType" },
                "my",
                { param: "pieceType" },
                "can make, award",
              ],
            },
            defense: {
              id: "defense",
              name: "Defended Pieces",
          description: "Reward pieces that are protected by friendly pieces",
              icon: "shield",
              category: "piece_coordination",
              specialRenderer: "defense",
              params: [
                {
                  name: "pieceType",
                  type: "select",
                  options: ["any piece", "knight", "bishop", "rook", "queen"],
                  optionValues: ["any", "knight", "bishop", "rook", "queen"],
                  label: "Defended",
                },
                {
                  name: "defenderType",
                  type: "select",
                  options: [
                    "any piece",
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                  ],
                  optionValues: [
                    "any",
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                  ],
                  label: "By",
                },
                {
                  name: "minDefenders",
                  type: "number",
                  min: 1,
                  max: 5,
                  label: "Min",
                  default: 1,
                },
              ],
              sentence: [
                "For each",
                { param: "pieceType" },
                "defended by",
                { param: "defenderType" },
                "(at least",
                { param: "minDefenders" },
                "times), award",
              ],
            },
            piece_distance: {
              id: "piece_distance",
              name: "Piece Distance",
          description: "Award based on Manhattan distance between two pieces",
              icon: "ruler",
              category: "positional",
              specialRenderer: "piece_distance",
              params: [
                {
                  name: "piece1",
                  type: "piece-select",
                  options: ["king", "queen", "rook", "bishop", "knight"],
                  optionValues: ["king", "queen", "rook", "bishop", "knight"],
                  label: "My piece",
                },
                {
                  name: "piece2",
                  type: "select",
                  options: ["their king", "their queen", "center"],
                  optionValues: ["opp_king", "opp_queen", "center"],
                  label: "Target",
                },
              ],
              sentence: ["For each square closer my", { param: "piece1" }, "is to", { param: "piece2" }, ", award"],
            },
            // Legacy - hidden from sidebar (absorbed into piece_placement)
            pawn_advancement: {
              id: "pawn_advancement",
              name: "Pawn Advancement",
          description: "Reward pawns that have pushed forward toward promotion",
              icon: "arrow-up",
              category: "pawn_structure",
              specialRenderer: "pawn_advancement",
              hidden: true,
              params: [],
              sentence: ["For each rank my pawns have advanced, award"],
            },
            // CONSOLIDATED: king_zone absorbs king_safety, king_tropism
            king_zone: {
              id: "king_zone",
              name: "King Attackers",
              description: "Count enemy pieces attacking squares near the king",
              icon: "shield-alert",
              category: "king_safety",
              specialRenderer: "king_zone",
              params: [
                {
                  name: "whose",
                  type: "select",
                  options: ["my king", "their king"],
                  optionValues: ["my_king", "opp_king"],
                  label: "Whose king",
                },
              ],
              sentence: [
                "For each attacker near",
                { param: "whose" },
                ", award",
              ],
            },
            // Legacy - hidden from sidebar
            king_safety: {
              id: "king_safety",
              name: "King Safety",
              description: "Penalize positions where the king is under attack",
              icon: "shield-alert",
              category: "king_safety",
              specialRenderer: "king_safety",
              hidden: true,
              params: [],
              sentence: ["For each enemy attack near my king, award"],
            },
            check: {
              id: "check",
              name: "Giving Check",
              description: "Bonus when you are giving check to the opponent",
              icon: "zap",
              category: "threats",
              specialRenderer: "check",
              params: [],
              sentence: ["When I am giving check, award"],
            },
            global: {
              id: "global",
              name: "Position Bonus",
          description: "A flat bonus that applies when the condition is met",
              icon: "globe",
              category: "positional",
              specialRenderer: "global",
              params: [],
              sentence: ["Award a flat bonus of"],
            },
            // CONSOLIDATED: pawn_formation absorbs pawn_structure, passed_pawn, pawn_chain
            pawn_formation: {
              id: "pawn_formation",
              name: "Pawn Formation",
              description: "Evaluate pawn formations and structure patterns",
              icon: "layout-grid",
              category: "pawn_structure",
              specialRenderer: "pawn_formation",
              params: [
                {
                  name: "formationType",
                  type: "select",
                  options: [
                    "doubled pawns",
                    "isolated pawns",
                    "connected pawns",
                    "passed pawns",
                    "chain pawns",
                    "backward pawns",
                    "phalanx pawns",
                  ],
                  optionValues: [
                    "doubled",
                    "isolated",
                    "connected",
                    "passed",
                    "chain",
                    "backward",
                    "phalanx",
                  ],
                  label: "Type",
                },
              ],
          sentence: ["For each", { param: "formationType" }, "I have, award"],
            },
            // Legacy - hidden from sidebar
            pawn_structure: {
              id: "pawn_structure",
              name: "Pawn Structure",
              description:
                "Evaluate pawn formations like doubled, isolated, or connected pawns",
              icon: "layout-grid",
              category: "pawn_structure",
              specialRenderer: "pawn_structure",
              hidden: true,
              params: [
                {
                  name: "structureType",
                  type: "select",
                  options: [
                    "doubled pawns",
                    "isolated pawns",
                    "connected pawns",
                    "backward pawns",
                    "phalanx pawns",
                  ],
                  optionValues: [
                    "doubled",
                    "isolated",
                    "connected",
                    "backward",
                    "phalanx",
                  ],
                  label: "Type",
                },
              ],
          sentence: ["For each", { param: "structureType" }, "I have, award"],
            },
            // Legacy - hidden from sidebar (absorbed into pawn_formation)
            passed_pawn: {
              id: "passed_pawn",
              name: "Passed Pawns",
              description: "Reward passed pawns based on how advanced they are",
              icon: "arrow-up-circle",
              category: "pawn_structure",
              specialRenderer: "passed_pawn",
              hidden: true,
              params: [
                {
                  name: "measureType",
                  type: "select",
                  options: [
                    "rank advancement",
                    "distance to promote",
                    "rank squared",
                    "is protected",
                  ],
              optionValues: ["rank", "distance", "squared_rank", "protected"],
                  label: "Measure",
                },
              ],
              sentence: [
                "For each passed pawn's",
                { param: "measureType" },
                ", award",
              ],
            },
            rook_file: {
              id: "rook_file",
              name: "Rook File Quality",
              description: "Award rooks based on how open their file is",
              icon: "columns-3",
              category: "rook_activity",
              specialRenderer: "rook_file",
              params: [],
              sentence: ["For each rook's file openness (0-2), award"],
            },
            // CONSOLIDATED: square_control absorbs center_control, space, weak_squares
            square_control: {
              id: "square_control",
              name: "Square Control",
              description: "Award points for squares you control in a region",
              icon: "target",
              category: "positional",
              specialRenderer: "toggle_grid",
              gridType: "control",
              params: [
                {
                  name: "squares",
                  type: "square-grid",
                  label: "Squares",
                },
              ],
              sentence: ["For each square I control in selected region, award"],
            },
            // Legacy - hidden from sidebar
            center_control: {
              id: "center_control",
              name: "Center Control",
              description: "Reward control of central squares",
              icon: "target",
              category: "center_control",
              specialRenderer: "center_control",
              hidden: true,
              params: [
                {
                  name: "centerType",
                  type: "select",
              options: ["core center (d4,e4,d5,e5)", "extended center (c3-f6)"],
                  optionValues: ["core", "extended"],
                  label: "Area",
                },
              ],
              sentence: [
                "For my control advantage in the",
                { param: "centerType" },
                ", award",
              ],
            },
            // Legacy - hidden from sidebar (absorbed into piece_placement)
            development: {
              id: "development",
              name: "Piece Development",
              description:
                "Reward pieces that have developed from starting squares",
              icon: "trending-up",
              category: "development",
              specialRenderer: "development",
              hidden: true,
              params: [
                {
                  name: "developType",
                  type: "select",
                  options: [
                    "developed pieces",
                    "fianchettoed bishops",
                    "central knights",
                  ],
                  optionValues: ["all_minors", "fianchetto", "central_knight"],
                  label: "Type",
                },
              ],
              sentence: ["For each", { param: "developType" }, ", award"],
            },
            // Legacy - hidden from sidebar (absorbed into piece_count)
            bishop_pair: {
              id: "bishop_pair",
              name: "Bishop Pair",
          description: "Bonus for having both light and dark squared bishops",
              icon: "copy",
              category: "material",
              specialRenderer: "bishop_pair",
              hidden: true,
              params: [],
              sentence: ["If I have the bishop pair, award"],
            },
            // CONSOLIDATED: piece_placement absorbs outpost, development, pawn_advancement
            piece_placement: {
              id: "piece_placement",
              name: "Piece Placement",
              description: "Award points for pieces on specific squares",
              icon: "map-pin",
              category: "positional",
              specialRenderer: "toggle_grid",
              gridType: "placement",
              params: [
                {
                  name: "pieceType",
                  type: "select",
                  options: [
                    "any piece",
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                  ],
                  optionValues: [
                    "any",
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                  ],
                  label: "Piece",
                },
                {
                  name: "squares",
                  type: "square-grid",
                  label: "Squares",
                },
              ],
              sentence: [
                "For each",
                { param: "pieceType" },
                "on selected squares, award",
              ],
            },
            // Legacy - hidden from sidebar
            outpost: {
              id: "outpost",
              name: "Outpost",
              description:
                "Bonus for pieces on squares that cannot be attacked by enemy pawns",
              icon: "flag",
              category: "positional",
              specialRenderer: "outpost",
              hidden: true,
              params: [
                {
                  name: "pieceType",
                  type: "select",
                  options: ["any minor piece", "knight only", "bishop only"],
                  optionValues: ["any", "knight", "bishop"],
                  label: "Piece",
                },
              ],
              sentence: [
                "For each",
                { param: "pieceType" },
                "on an outpost, award",
              ],
            },
            // Legacy - hidden from sidebar (absorbed into square_control)
            weak_squares: {
              id: "weak_squares",
              name: "Weak Squares",
              description:
                "Count squares in enemy territory that cannot be defended by pawns",
              icon: "alert-triangle",
              category: "positional",
              specialRenderer: "weak_squares",
              hidden: true,
              params: [
                {
                  name: "region",
                  type: "select",
                  options: [
                    "opponent's camp",
                    "around opponent's king",
                    "center squares",
                  ],
                  optionValues: ["camp", "king_zone", "center"],
                  label: "Region",
                },
              ],
          sentence: ["For each weak square in", { param: "region" }, ", award"],
            },
            battery: {
              id: "battery",
              name: "Battery",
              description:
                "Bonus for aligned attacking pieces (e.g. Queen + Rook on same file)",
              icon: "zap",
              category: "piece_coordination",
              specialRenderer: "battery",
              params: [
                {
                  name: "batteryType",
                  type: "select",
                  options: [
                    "any battery",
                    "rook battery (file/rank)",
                    "bishop battery (diagonal)",
                  ],
                  optionValues: ["any", "rook_battery", "bishop_battery"],
                  label: "Type",
                },
              ],
              sentence: ["For each", { param: "batteryType" }, ", award"],
            },
            // Legacy - hidden from sidebar (absorbed into king_zone)
            king_tropism: {
              id: "king_tropism",
              name: "King Tropism",
              description: "Bonus for pieces that are close to the enemy king",
              icon: "crosshair",
              category: "king_safety",
              specialRenderer: "king_tropism",
              hidden: true,
              params: [
                {
                  name: "pieceType",
                  type: "select",
              options: ["all pieces", "knights", "bishops", "rooks", "queens"],
                  optionValues: ["any", "knight", "bishop", "rook", "queen"],
                  label: "Piece",
                },
              ],
              sentence: [
                "For",
                { param: "pieceType" },
                "proximity to enemy king, award",
              ],
            },
            // Legacy - hidden from sidebar (absorbed into pawn_formation)
            pawn_chain: {
              id: "pawn_chain",
              name: "Pawn Chain",
              description: "Evaluate pawns that are part of diagonal chains",
              icon: "link",
              category: "pawn_structure",
              specialRenderer: "pawn_chain",
              hidden: true,
              params: [
                {
                  name: "role",
                  type: "select",
                  options: [
                    "any chain pawn",
                    "chain base",
                    "chain member",
                    "chain head",
                  ],
                  optionValues: ["any", "base", "member", "head"],
                  label: "Role",
                },
              ],
          sentence: ["For each pawn that is a", { param: "role" }, ", award"],
            },
            // Legacy - hidden from sidebar (absorbed into square_control)
            space: {
              id: "space",
              name: "Space Advantage",
              description:
                "Reward control of squares in your own territory behind pawns",
              icon: "maximize",
              category: "positional",
              specialRenderer: "space",
              hidden: true,
              params: [],
              sentence: ["For each square of space I control, award"],
            },
            piece_square_table: {
              id: "piece_square_table",
              name: "Piece-Square Table",
              description:
                "Apply positional bonuses based on where each piece is located on the board",
              icon: "grid-3x3",
              category: "positional",
              specialRenderer: "pst",
              params: [
                {
                  name: "pieceType",
                  type: "select",
              options: ["Pawn", "Knight", "Bishop", "Rook", "Queen", "King"],
                  optionValues: [
                    "pawn",
                    "knight",
                    "bishop",
                    "rook",
                    "queen",
                "king",
                  ],
                  label: "Piece",
                },
                {
                  name: "preset",
                  type: "select",
              options: [
                "Simplified (Classic)",
                "PeSTO Middlegame",
                "PeSTO Endgame",
                "Development (Opening)",
                "Aggressive",
                "Defensive",
              ],
                  optionValues: [
                "simplified",
                "pesto_mg",
                "pesto_eg",
                "development",
                    "aggressive",
                    "defensive",
                  ],
                  label: "Preset",
                },
              ],
              sentence: [
                "Apply",
                { param: "preset" },
                "position table for",
                { param: "pieceType" },
              ],
            },
          },
          values: {
            fixed: {
              id: "fixed",
              name: "Fixed Value",
              description: "Award a fixed number of centipawns",
              icon: "equal",
              params: [
                {
                  name: "value",
                  type: "number",
                  min: -1000,
                  max: 1000,
                  label: "cp",
                  default: 100,
                },
              ],
              sentence: [{ param: "value" }, "centipawns"],
            },
            formula: {
              id: "formula",
              name: "Custom Formula",
              description: "Use a formula where n = the count from target",
              icon: "sigma",
              params: [
                {
                  name: "formula",
                  type: "formula",
                  label: "Formula",
                  placeholder: "10 * sqrt(n)",
                  default: "n * 10",
                },
              ],
              sentence: ["f(n) =", { param: "formula" }, "centipawns"],
            },
          },
        };
    }
    
    /**
   * Piece-Square Table presets (8x8 grids, from White's perspective)
   * Ranks are ordered: rank 8 (top) to rank 1 (bottom) for display
     * Values in centipawns, positive = good for the piece to be there
   *
   * Sources:
   * - simplified: Tomasz Michniewski's Simplified Evaluation Function (chessprogramming.org)
   * - pesto_mg: PeSTO middlegame tables (Ronald Friederich, Texel-tuned)
   * - pesto_eg: PeSTO endgame tables (Ronald Friederich, Texel-tuned)
   * - aggressive: Custom tables favoring forward positions
   * - defensive: Custom tables favoring safe positions
     */
    getPSTPresets() {
        return {
            pawn: {
        // Tomasz Michniewski's Simplified Evaluation Function
        simplified: [
          [0, 0, 0, 0, 0, 0, 0, 0], // Rank 8 (promotes)
          [50, 50, 50, 50, 50, 50, 50, 50], // Rank 7
          [10, 10, 20, 30, 30, 20, 10, 10], // Rank 6
          [5, 5, 10, 25, 25, 10, 5, 5], // Rank 5
          [0, 0, 0, 20, 20, 0, 0, 0], // Rank 4
          [5, -5, -10, 0, 0, -10, -5, 5], // Rank 3
          [5, 10, 10, -20, -20, 10, 10, 5], // Rank 2
          [0, 0, 0, 0, 0, 0, 0, 0], // Rank 1 (no pawns)
        ],
        // PeSTO middlegame (Texel-tuned)
        pesto_mg: [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [98, 134, 61, 95, 68, 126, 34, -11],
          [-6, 7, 26, 31, 65, 56, 25, -20],
          [-14, 13, 6, 21, 23, 12, 17, -23],
          [-27, -2, -5, 12, 17, 6, 10, -25],
          [-26, -4, -4, -10, 3, 3, 33, -12],
          [-35, -1, -20, -23, -15, 24, 38, -22],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        // PeSTO endgame (Texel-tuned)
        pesto_eg: [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [178, 173, 158, 134, 147, 132, 165, 187],
          [94, 100, 85, 67, 56, 53, 82, 84],
          [32, 24, 13, 5, -2, 4, 17, 17],
          [13, 9, -3, -7, -7, -8, 3, -1],
          [4, 7, -6, 1, 0, -5, -1, -8],
          [13, 8, 8, 10, 13, 0, 2, -7],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        aggressive: [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [60, 60, 60, 60, 60, 60, 60, 60],
          [15, 15, 25, 35, 35, 25, 15, 15],
          [5, 5, 10, 30, 30, 10, 5, 5],
          [0, 0, 0, 25, 25, 0, 0, 0],
          [5, -5, -10, 0, 0, -10, -5, 5],
          [5, 10, 10, -25, -25, 10, 10, 5],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        defensive: [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [-15, -10, -10, -10, -10, -10, -10, -15],
          [-10, -5, -5, 0, 0, -5, -5, -10],
          [-5, 0, 0, 5, 5, 0, 0, -5],
          [0, 5, 5, 10, 10, 5, 5, 0],
          [5, 10, 10, 10, 10, 10, 10, 5],
          [10, 15, 15, 15, 15, 15, 15, 10],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ],
            },
            knight: {
        // Tomasz Michniewski's Simplified Evaluation Function
        simplified: [
                    [-50, -40, -30, -30, -30, -30, -40, -50],
          [-40, -20, 0, 0, 0, 0, -20, -40],
          [-30, 0, 10, 15, 15, 10, 0, -30],
          [-30, 5, 15, 20, 20, 15, 5, -30],
          [-30, 0, 15, 20, 20, 15, 0, -30],
          [-30, 5, 10, 15, 15, 10, 5, -30],
          [-40, -20, 0, 5, 5, 0, -20, -40],
          [-50, -40, -30, -30, -30, -30, -40, -50],
        ],
        // PeSTO middlegame (Texel-tuned)
        pesto_mg: [
          [-167, -89, -34, -49, 61, -97, -15, -107],
          [-73, -41, 72, 36, 23, 62, 7, -17],
          [-47, 60, 37, 65, 84, 129, 73, 44],
          [-9, 17, 19, 53, 37, 69, 18, 22],
          [-13, 4, 16, 13, 28, 19, 21, -8],
          [-23, -9, 12, 10, 19, 17, 25, -16],
          [-29, -53, -12, -3, -1, 18, -14, -19],
          [-105, -21, -58, -33, -17, -28, -19, -23],
        ],
        // PeSTO endgame (Texel-tuned)
        pesto_eg: [
          [-58, -38, -13, -28, -31, -27, -63, -99],
          [-25, -8, -25, -2, -9, -25, -24, -52],
          [-24, -20, 10, 9, -1, -9, -19, -41],
          [-17, 3, 22, 22, 22, 11, 8, -18],
          [-18, -6, 16, 25, 16, 17, 4, -18],
          [-23, -3, -1, 15, 10, -3, -20, -22],
          [-42, -20, -10, -5, -2, -20, -23, -44],
          [-29, -51, -23, -15, -22, -18, -50, -64],
        ],
        // Development - strongly penalize knights on starting squares
        development: [
          [-60, -40, -30, -30, -30, -30, -40, -60],
          [-40, -20, 5, 10, 10, 5, -20, -40],
          [-30, 10, 20, 25, 25, 20, 10, -30],
          [-30, 15, 25, 30, 30, 25, 15, -30],
          [-30, 10, 25, 30, 30, 25, 10, -30],
          [-30, 15, 20, 25, 25, 20, 15, -30],
          [-40, -20, 5, 10, 10, 5, -20, -40],
          [-70, -50, -40, -40, -40, -40, -50, -70], // Heavy penalty for b1/g1
        ],
        aggressive: [
          [-50, -30, -30, -30, -30, -30, -30, -50],
          [-30, -20, 0, 5, 5, 0, -20, -30],
          [-30, 0, 20, 25, 25, 20, 0, -30],
          [-30, 5, 25, 35, 35, 25, 5, -30],
          [-30, 0, 25, 35, 35, 25, 0, -30],
          [-30, 5, 20, 25, 25, 20, 5, -30],
          [-30, -20, 0, 10, 10, 0, -20, -30],
          [-50, -30, -30, -30, -30, -30, -30, -50],
        ],
        defensive: [
          [-50, -40, -30, -30, -30, -30, -40, -50],
          [-40, -30, -20, -15, -15, -20, -30, -40],
          [-25, -10, 0, 5, 5, 0, -10, -25],
          [-20, 0, 10, 15, 15, 10, 0, -20],
          [-20, 0, 15, 20, 20, 15, 0, -20],
          [-20, 5, 10, 15, 15, 10, 5, -20],
          [-25, 0, 5, 5, 5, 5, 0, -25],
          [-40, -25, -20, -20, -20, -20, -25, -40],
        ],
            },
            bishop: {
        // Tomasz Michniewski's Simplified Evaluation Function
        simplified: [
                    [-20, -10, -10, -10, -10, -10, -10, -20],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-10, 0, 5, 10, 10, 5, 0, -10],
          [-10, 5, 5, 10, 10, 5, 5, -10],
          [-10, 0, 10, 10, 10, 10, 0, -10],
          [-10, 10, 10, 10, 10, 10, 10, -10],
          [-10, 5, 0, 0, 0, 0, 5, -10],
          [-20, -10, -10, -10, -10, -10, -10, -20],
        ],
        // PeSTO middlegame (Texel-tuned)
        pesto_mg: [
          [-29, 4, -82, -37, -25, -42, 7, -8],
          [-26, 16, -18, -13, 30, 59, 18, -47],
          [-16, 37, 43, 40, 35, 50, 37, -2],
          [-4, 5, 19, 50, 37, 37, 7, -2],
          [-6, 13, 13, 26, 34, 12, 10, 4],
          [0, 15, 15, 15, 14, 27, 18, 10],
          [4, 15, 16, 0, 7, 21, 33, 1],
          [-33, -3, -14, -21, -13, -12, -39, -21],
        ],
        // PeSTO endgame (Texel-tuned)
        pesto_eg: [
          [-14, -21, -11, -8, -7, -9, -17, -24],
          [-8, -4, 7, -12, -3, -13, -4, -14],
          [2, -8, 0, -1, -2, 6, 0, 4],
          [-3, 9, 12, 9, 14, 10, 3, 2],
          [-6, 3, 13, 19, 7, 10, -3, -9],
          [-12, -3, 8, 10, 13, 3, -7, -15],
          [-14, -18, -7, -1, 4, -9, -15, -27],
          [-23, -9, -23, -5, -9, -16, -5, -17],
        ],
        // Development - penalize bishops on starting squares, reward active diagonals
        development: [
          [-30, -20, -20, -20, -20, -20, -20, -30],
          [-20, 0, 5, 10, 10, 5, 0, -20],
          [-20, 10, 15, 15, 15, 15, 10, -20],
          [-20, 10, 15, 20, 20, 15, 10, -20],
          [-20, 10, 15, 20, 20, 15, 10, -20],
          [-20, 15, 15, 15, 15, 15, 15, -20],
          [-20, 5, 0, 0, 0, 0, 5, -20],
          [-40, -30, -30, -30, -30, -30, -30, -40], // Heavy penalty for c1/f1
        ],
        aggressive: [
          [-20, -10, -10, -10, -10, -10, -10, -20],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-10, 0, 5, 10, 10, 5, 0, -10],
          [-10, 5, 10, 15, 15, 10, 5, -10],
          [-10, 0, 15, 15, 15, 15, 0, -10],
          [-10, 15, 10, 10, 10, 10, 15, -10],
          [-10, 10, 0, 0, 0, 0, 10, -10],
          [-20, -10, -10, -10, -10, -10, -10, -20],
        ],
        defensive: [
          [-20, -15, -15, -15, -15, -15, -15, -20],
          [-15, -10, -10, -10, -10, -10, -10, -15],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-5, 0, 5, 10, 10, 5, 0, -5],
          [-5, 0, 10, 10, 10, 10, 0, -5],
          [-5, 5, 5, 10, 10, 5, 5, -5],
          [-5, 10, 10, 5, 5, 10, 10, -5],
          [-10, -5, -5, -5, -5, -5, -5, -10],
        ],
            },
            rook: {
        // Tomasz Michniewski's Simplified Evaluation Function
        simplified: [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [5, 10, 10, 10, 10, 10, 10, 5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [0, 0, 0, 5, 5, 0, 0, 0],
        ],
        // PeSTO middlegame (Texel-tuned)
        pesto_mg: [
          [32, 42, 32, 51, 63, 9, 31, 43],
          [27, 32, 58, 62, 80, 67, 26, 44],
          [-5, 19, 26, 36, 17, 45, 61, 16],
          [-24, -11, 7, 26, 24, 35, -8, -20],
          [-36, -26, -12, -1, 9, -7, 6, -23],
          [-45, -25, -16, -17, 3, 0, -5, -33],
          [-44, -16, -20, -9, -1, 11, -6, -71],
          [-19, -13, 1, 17, 16, 7, -37, -26],
        ],
        // PeSTO endgame (Texel-tuned)
        pesto_eg: [
          [13, 10, 18, 15, 12, 12, 8, 5],
          [11, 13, 13, 11, -3, 3, 8, 3],
          [7, 7, 7, 5, 4, -3, -5, -3],
          [4, 3, 13, 1, 2, 1, -1, 2],
          [3, 5, 8, 4, -5, -6, -8, -11],
          [-4, 0, -5, -1, -7, -12, -8, -16],
          [-6, -6, 0, 2, -9, -9, -11, -3],
          [-9, 2, 3, -1, -5, -13, 4, -20],
        ],
        // Development - rooks are fine on back rank early, slight penalty for corners
        development: [
          [5, 5, 5, 5, 5, 5, 5, 5],
          [5, 10, 10, 10, 10, 10, 10, 5],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [-5, 0, 0, 5, 5, 0, 0, -5], // Slight corner penalty, reward d1/e1 after castling
        ],
        aggressive: [
          [0, 0, 0, 5, 5, 0, 0, 0],
          [10, 15, 15, 15, 15, 15, 15, 10],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [0, 0, 5, 10, 10, 5, 0, 0],
        ],
        defensive: [
          [-20, -15, -15, -15, -15, -15, -15, -20],
          [-15, -10, -10, -10, -10, -10, -10, -15],
          [-10, -5, -5, -5, -5, -5, -5, -10],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [0, 5, 5, 5, 5, 5, 5, 0],
          [5, 10, 10, 10, 10, 10, 10, 5],
        ],
            },
            queen: {
        // Tomasz Michniewski's Simplified Evaluation Function
        simplified: [
          [-20, -10, -10, -5, -5, -10, -10, -20],
          [-10, 0, 0, 0, 0, 5, 0, -10],
          [-10, 0, 5, 5, 5, 5, 5, -10],
          [-5, 0, 5, 5, 5, 5, 0, 0],
          [-5, 0, 5, 5, 5, 5, 0, -5],
          [-10, 0, 5, 5, 5, 5, 0, -10],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-20, -10, -10, -5, -5, -10, -10, -20],
        ],
        // PeSTO middlegame (Texel-tuned)
        pesto_mg: [
          [-28, 0, 29, 12, 59, 44, 43, 45],
          [-24, -39, -5, 1, -16, 57, 28, 54],
          [-13, -17, 7, 8, 29, 56, 47, 57],
          [-27, -27, -16, -16, -1, 17, -2, 1],
          [-9, -26, -9, -10, -2, -4, 3, -3],
          [-14, 2, -11, -2, -5, 2, 14, 5],
          [-35, -8, 11, 2, 8, 15, -3, 1],
          [-1, -18, -9, 10, -15, -25, -31, -50],
        ],
        // PeSTO endgame (Texel-tuned)
        pesto_eg: [
          [-9, 22, 22, 27, 27, 19, 10, 20],
          [-17, 20, 32, 41, 58, 25, 30, 0],
          [-20, 6, 9, 49, 47, 35, 19, 9],
          [3, 22, 24, 45, 57, 40, 57, 36],
          [-18, 28, 19, 47, 31, 34, 39, 23],
          [-16, -27, 15, 6, 9, 17, 10, 5],
          [-22, -23, -30, -16, -16, -23, -36, -32],
          [-33, -28, -22, -43, -5, -32, -20, -41],
        ],
        // Development - penalize early queen moves, keep queen back
        development: [
          [-30, -20, -20, -15, -15, -20, -20, -30],
          [-20, -10, -10, -10, -10, -10, -10, -20],
          [-15, -10, -5, -5, -5, -5, -10, -15],
          [-10, -5, 0, 0, 0, 0, -5, -10],
          [-10, -5, 0, 0, 0, 0, -5, -10],
          [-10, -5, 0, 0, 0, 0, -5, -10],
          [-5, 0, 0, 0, 0, 0, 0, -5],
          [0, 0, 0, 5, 5, 0, 0, 0], // d1 is fine, slight bonus after development
        ],
        aggressive: [
          [-20, -10, -10, -5, -5, -10, -10, -20],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-10, 0, 5, 5, 5, 5, 0, -10],
          [-5, 0, 5, 5, 5, 5, 0, -5],
          [-5, 0, 5, 5, 5, 5, 0, -5],
          [-10, 5, 5, 5, 5, 5, 5, -10],
          [-10, 0, 5, 0, 0, 5, 0, -10],
          [-20, -10, -10, -5, -5, -10, -10, -20],
        ],
        defensive: [
          [-20, -10, -10, -5, -5, -10, -10, -20],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-10, 0, 5, 5, 5, 5, 0, -10],
          [-5, 0, 5, 5, 5, 5, 0, -5],
          [-5, 0, 5, 5, 5, 5, 0, -5],
          [-10, 0, 5, 5, 5, 5, 0, -10],
          [-10, 0, 0, 0, 0, 0, 0, -10],
          [-20, -10, -10, -5, -5, -10, -10, -20],
        ],
      },
      king: {
        // Tomasz Michniewski's Simplified Evaluation - middlegame king (safe)
        simplified: [
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-30, -40, -40, -50, -50, -40, -40, -30],
                    [-20, -30, -30, -40, -40, -30, -30, -20],
                    [-10, -20, -20, -20, -20, -20, -20, -10],
          [20, 20, 0, 0, 0, 0, 20, 20],
          [20, 30, 10, 0, 0, 10, 30, 20],
        ],
        // PeSTO middlegame king - keep king safe, use with "In middlegame" condition
        pesto_mg: [
          [-65, 23, 16, -15, -56, -34, 2, 13],
          [29, -1, -20, -7, -8, -4, -38, -29],
          [-9, 24, 2, -16, -20, 6, 22, -22],
          [-17, -20, -12, -27, -30, -25, -14, -36],
          [-49, -1, -27, -39, -46, -44, -33, -51],
          [-14, -14, -22, -46, -44, -30, -15, -27],
          [1, 7, -8, -64, -43, -16, 9, 8],
          [-15, 36, 12, -54, 8, -28, 24, 14],
        ],
        // PeSTO endgame king - king becomes active, use with "In endgame" condition
        pesto_eg: [
          [-74, -35, -18, -18, -11, 15, 4, -17],
          [-12, 17, 14, 17, 17, 38, 23, 11],
          [10, 17, 23, 15, 20, 45, 44, 13],
          [-8, 22, 24, 27, 26, 33, 26, 3],
          [-18, -4, 21, 24, 27, 23, 9, -11],
          [-19, -3, 11, 21, 23, 16, 7, -9],
          [-27, -11, 4, 13, 14, 4, -5, -17],
          [-53, -34, -21, -11, -28, -14, -24, -43],
        ],
        // Development - strongly encourage castling (g1/c1 squares are best)
        development: [
          [-60, -60, -60, -60, -60, -60, -60, -60],
          [-50, -50, -50, -50, -50, -50, -50, -50],
          [-50, -50, -50, -50, -50, -50, -50, -50],
          [-40, -40, -40, -40, -40, -40, -40, -40],
          [-30, -30, -30, -30, -30, -30, -30, -30],
          [-20, -20, -20, -20, -20, -20, -20, -20],
          [10, 10, -10, -20, -20, -10, 10, 10],
          [0, 10, 30, -20, 0, -20, 30, 10], // c1/g1 castled positions rewarded
        ],
        aggressive: [
          [-30, -40, -40, -50, -50, -40, -40, -30],
          [-30, -40, -40, -50, -50, -40, -40, -30],
          [-30, -40, -40, -50, -50, -40, -40, -30],
          [-30, -40, -40, -50, -50, -40, -40, -30],
          [-20, -30, -30, -40, -40, -30, -30, -20],
          [-10, -10, -20, -20, -20, -20, -10, -10],
          [10, 20, 0, 0, 0, 0, 20, 10],
          [20, 30, 10, 0, 0, 10, 30, 20],
        ],
        defensive: [
          [-50, -60, -60, -70, -70, -60, -60, -50],
          [-40, -50, -50, -60, -60, -50, -50, -40],
          [-40, -50, -50, -60, -60, -50, -50, -40],
          [-40, -50, -50, -60, -60, -50, -50, -40],
          [-30, -40, -40, -50, -50, -40, -40, -30],
          [0, 0, -10, -20, -20, -10, 0, 0],
          [30, 30, 20, 0, 0, 20, 30, 30],
          [30, 40, 30, 10, 10, 30, 40, 30],
        ],
      },
        };
    }
    
    // ============================================
    // PHASE 1: VISUAL COMPONENTS
    // ============================================
    
    /**
     * Render a visual piece selector with single pieces and pairs
     * @param {string} selected - Currently selected piece type
     * @param {function} onChange - Callback when selection changes
     * @param {boolean} includePairs - Whether to include pair options
     */
  renderPieceSelector(selected = "pawn", onChange = null, includePairs = true) {
    const container = document.createElement("div");
    container.className = "piece-selector";
        
        // Define piece options with image URLs
        const pieces = [
      { id: "pawn", name: "Pawn" },
      { id: "knight", name: "Knight" },
      { id: "bishop", name: "Bishop" },
      { id: "rook", name: "Rook" },
      { id: "queen", name: "Queen" },
        ];
        
        // Define pair options
        const pairs = [
      { id: "knight_pair", name: "Knight Pair", basePiece: "knight" },
      { id: "bishop_pair", name: "Bishop Pair", basePiece: "bishop" },
      { id: "rook_pair", name: "Rook Pair", basePiece: "rook" },
        ];
        
        // Piece image URL helper
        const getPieceUrl = (pieceId) => {
          const pieceMap = { pawn: 'wp', knight: 'wn', bishop: 'wb', rook: 'wr', queen: 'wq', king: 'wk' };
          return `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${pieceMap[pieceId]}.png`;
        };
        
        // Create single pieces section
    const singlesDiv = document.createElement("div");
    singlesDiv.className = "piece-selector-group";

    pieces.forEach((piece) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = `piece-option ${selected === piece.id ? "selected" : ""}`;
            option.dataset.pieceId = piece.id;
            option.title = piece.name;
            option.innerHTML = `<span class="piece-icon" style="background-image: url('${getPieceUrl(piece.id)}')"></span>`;
            
      option.addEventListener("click", () => {
        container
          .querySelectorAll(".piece-option")
          .forEach((o) => o.classList.remove("selected"));
        option.classList.add("selected");
                if (onChange) onChange(piece.id);
                // Also update hidden input if it exists
                const hiddenInput = container.querySelector('input[name="pieceType"]');
                if (hiddenInput) hiddenInput.value = piece.id;
            });
            
            singlesDiv.appendChild(option);
        });
        
        container.appendChild(singlesDiv);
        
        // Create pairs section if enabled
        if (includePairs) {
      const divider = document.createElement("div");
      divider.className = "piece-selector-divider";
            container.appendChild(divider);
            
      const pairsDiv = document.createElement("div");
      pairsDiv.className = "piece-selector-group piece-pairs";

      pairs.forEach((pair) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = `piece-option piece-pair-option ${selected === pair.id ? "selected" : ""}`;
                option.dataset.pieceId = pair.id;
                option.title = pair.name;
                option.innerHTML = `
                  <span class="piece-pair-icons">
                    <span class="piece-icon piece-icon-small" style="background-image: url('${getPieceUrl(pair.basePiece)}')"></span>
                    <span class="piece-icon piece-icon-small" style="background-image: url('${getPieceUrl(pair.basePiece)}')"></span>
                  </span>`;
                
        option.addEventListener("click", () => {
          container
            .querySelectorAll(".piece-option")
            .forEach((o) => o.classList.remove("selected"));
          option.classList.add("selected");
                    if (onChange) onChange(pair.id);
                    // Also update hidden input if it exists
          const hiddenInput = container.querySelector(
            'input[name="pieceType"]',
          );
                    if (hiddenInput) hiddenInput.value = pair.id;
                });
                
                pairsDiv.appendChild(option);
            });
            
            container.appendChild(pairsDiv);
        }
        
        // Hidden input for form data
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "pieceType";
        hiddenInput.value = selected;
    hiddenInput.className = "param-input";
        container.appendChild(hiddenInput);
        
        return container;
    }
    
    /**
     * Render an inline expandable 8x8 toggle grid for square selection
     * @param {Set|Array} selectedSquares - Set of selected square names (e.g., 'd4', 'e5')
     * @param {Array} presets - Array of preset configurations
     * @param {function} onUpdate - Callback when squares change
     * @param {boolean} startExpanded - Whether to start expanded
     */
  renderToggleGrid(
    selectedSquares = new Set(),
    presets = [],
    onUpdate = null,
    startExpanded = false,
  ) {
    const selected = new Set(
      Array.isArray(selectedSquares) ? selectedSquares : selectedSquares,
    );

    const container = document.createElement("div");
    container.className = "toggle-grid-container";
        
        // Mini preview (collapsed)
    const preview = document.createElement("div");
    preview.className = "toggle-grid-preview";
    preview.title = "Click to edit squares";
        this.updateGridPreview(preview, selected);
        
        // Expanded editor
    const editor = document.createElement("div");
    editor.className = `toggle-grid-editor ${startExpanded ? "expanded" : ""}`;
        
        // Presets row
        if (presets.length > 0) {
      const presetsRow = document.createElement("div");
      presetsRow.className = "grid-presets";

      presets.forEach((preset) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "preset-btn";
                btn.textContent = preset.name;
        btn.title = preset.description || "";
                
        btn.addEventListener("click", () => {
                    selected.clear();
          preset.squares.forEach((sq) => selected.add(sq));
                    this.updateGridPreview(preview, selected);
                    this.updateGridEditor(editor, selected, onUpdate);
                    if (onUpdate) onUpdate(Array.from(selected));
                    // Update hidden input
                    const hiddenInput = container.querySelector('input[name="squares"]');
          if (hiddenInput)
            hiddenInput.value = JSON.stringify(Array.from(selected));
                });
                
                presetsRow.appendChild(btn);
            });
            
            // Clear button
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "preset-btn preset-clear";
      clearBtn.textContent = "Clear";
      clearBtn.addEventListener("click", () => {
                selected.clear();
                this.updateGridPreview(preview, selected);
                this.updateGridEditor(editor, selected, onUpdate);
                if (onUpdate) onUpdate(Array.from(selected));
                // Update hidden input
                const hiddenInput = container.querySelector('input[name="squares"]');
        if (hiddenInput)
          hiddenInput.value = JSON.stringify(Array.from(selected));
            });
            presetsRow.appendChild(clearBtn);
            
            editor.appendChild(presetsRow);
        }
        
        // 8x8 grid
    const grid = document.createElement("div");
    grid.className = "toggle-grid-board";
        
        // Render grid with rank/file labels
        for (let rank = 8; rank >= 1; rank--) {
            for (let file = 0; file < 8; file++) {
                const fileChar = String.fromCharCode(97 + file);
                const square = `${fileChar}${rank}`;
                const isLight = (file + rank) % 2 === 1;
                
        const cell = document.createElement("div");
        cell.className = `grid-cell ${isLight ? "light" : "dark"} ${selected.has(square) ? "selected" : ""}`;
                cell.dataset.square = square;
                cell.title = square;
                
        cell.addEventListener("click", () => {
                    if (selected.has(square)) {
                        selected.delete(square);
            cell.classList.remove("selected");
                    } else {
                        selected.add(square);
            cell.classList.add("selected");
                    }
                    this.updateGridPreview(preview, selected);
                    if (onUpdate) onUpdate(Array.from(selected));
                    // Update hidden input
                    const hiddenInput = container.querySelector('input[name="squares"]');
          if (hiddenInput)
            hiddenInput.value = JSON.stringify(Array.from(selected));
                });
                
                grid.appendChild(cell);
            }
        }
        
        editor.appendChild(grid);
        
        // Toggle expansion on preview click
    preview.addEventListener("click", () => {
      editor.classList.toggle("expanded");
        });
        
        container.appendChild(preview);
        container.appendChild(editor);
        
        // Hidden input for form data
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "squares";
        hiddenInput.value = JSON.stringify(Array.from(selected));
    hiddenInput.className = "param-input";
        container.appendChild(hiddenInput);
        
        return container;
    }
    
    /**
     * Update the mini preview grid
     */
    updateGridPreview(preview, selected) {
    preview.innerHTML = "";
        
        for (let rank = 8; rank >= 1; rank--) {
            for (let file = 0; file < 8; file++) {
                const fileChar = String.fromCharCode(97 + file);
                const square = `${fileChar}${rank}`;
                const isLight = (file + rank) % 2 === 1;
                
        const cell = document.createElement("div");
        cell.className = `preview-cell ${isLight ? "light" : "dark"} ${selected.has(square) ? "selected" : ""}`;
                preview.appendChild(cell);
            }
        }
    }
    
    /**
     * Update the expanded grid editor
     */
    updateGridEditor(editor, selected, onUpdate) {
    const cells = editor.querySelectorAll(".grid-cell");
    cells.forEach((cell) => {
            const square = cell.dataset.square;
            if (selected.has(square)) {
        cell.classList.add("selected");
            } else {
        cell.classList.remove("selected");
            }
        });
    }
    
    /**
     * Get preset configurations for square grids
     */
  getSquarePresets(type = "control") {
        const presets = {
            control: [
        {
          name: "Center",
          squares: ["d4", "d5", "e4", "e5"],
          description: "Core center squares",
        },
        {
          name: "Extended",
          squares: [
            "c3",
            "c4",
            "c5",
            "c6",
            "d3",
            "d4",
            "d5",
            "d6",
            "e3",
            "e4",
            "e5",
            "e6",
            "f3",
            "f4",
            "f5",
            "f6",
          ],
          description: "Extended center",
        },
        {
          name: "7th Rank",
          squares: ["a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7"],
          description: "Seventh rank for White",
        },
        {
          name: "Enemy Camp",
          squares: [
            "a5",
            "b5",
            "c5",
            "d5",
            "e5",
            "f5",
            "g5",
            "h5",
            "a6",
            "b6",
            "c6",
            "d6",
            "e6",
            "f6",
            "g6",
            "h6",
            "a7",
            "b7",
            "c7",
            "d7",
            "e7",
            "f7",
            "g7",
            "h7",
            "a8",
            "b8",
            "c8",
            "d8",
            "e8",
            "f8",
            "g8",
            "h8",
          ],
          description: "Opponent territory",
        },
        {
          name: "Kingside",
          squares: [
            "f1",
            "g1",
            "h1",
            "f2",
            "g2",
            "h2",
            "f3",
            "g3",
            "h3",
            "f4",
            "g4",
            "h4",
          ],
          description: "Kingside squares",
        },
        {
          name: "Queenside",
          squares: [
            "a1",
            "b1",
            "c1",
            "a2",
            "b2",
            "c2",
            "a3",
            "b3",
            "c3",
            "a4",
            "b4",
            "c4",
          ],
          description: "Queenside squares",
        },
            ],
            placement: [
        {
          name: "Outposts",
          squares: ["c5", "d5", "e5", "f5", "c6", "d6", "e6", "f6"],
          description: "Knight outpost squares",
        },
        {
          name: "Center",
          squares: ["d4", "d5", "e4", "e5"],
          description: "Central squares",
        },
        {
          name: "7th Rank",
          squares: ["a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7"],
          description: "Rook heaven",
        },
        {
          name: "Developed",
          squares: ["c3", "d3", "e3", "f3", "c4", "d4", "e4", "f4"],
          description: "Developed positions",
        },
        {
          name: "Advanced",
          squares: [
            "a5",
            "b5",
            "c5",
            "d5",
            "e5",
            "f5",
            "g5",
            "h5",
            "a6",
            "b6",
            "c6",
            "d6",
            "e6",
            "f6",
            "g6",
            "h6",
          ],
          description: "Advanced pawn ranks",
        },
      ],
        };
        
        return presets[type] || presets.control;
    }
    
    /**
     * Render a mini PST visualization for sidebar preview
     */
  renderPSTPreview(pieceType = "knight") {
    const container = document.createElement("div");
    container.className = "pst-preview";
        
        const presets = this.getPSTPresets();
    const table = presets[pieceType]?.simplified || presets.knight.simplified;
        
        // Create 8x8 mini grid
        for (let rank = 7; rank >= 0; rank--) {
            for (let file = 0; file < 8; file++) {
        const cell = document.createElement("div");
        cell.className = "pst-cell";
                const value = table[7 - rank][file];
                
                // Color based on value
        if (value > 20) cell.classList.add("pst-hot");
        else if (value > 0) cell.classList.add("pst-warm");
        else if (value < -20) cell.classList.add("pst-cold");
        else if (value < 0) cell.classList.add("pst-cool");
                
                container.appendChild(cell);
            }
        }
        
        return container;
    }
    
    /**
     * Render a visual preview for any target type
     * Dispatches to the appropriate renderer based on type
     */
    renderTargetPreview(rendererType) {
        switch (rendererType) {
      case "pst":
        return this.renderPSTPreview("knight");
      case "piece_selector":
                return this.renderPieceSelectorPreview();
      case "toggle_grid":
                return this.renderToggleGridPreview();
      case "king_zone":
                return this.renderKingZonePreview();
      case "pawn_formation":
                return this.renderPawnFormationPreview();
      case "material":
                return this.renderMaterialPreview();
      case "bishop_pair":
                return this.renderBishopPairPreview();
      case "mobility":
                return this.renderMobilityPreview();
      case "defense":
                return this.renderDefensePreview();
      case "pawn_advancement":
                return this.renderPawnAdvancementPreview();
      case "pawn_structure":
                return this.renderPawnStructurePreview();
      case "passed_pawn":
                return this.renderPassedPawnPreview();
      case "pawn_chain":
                return this.renderPawnChainPreview();
      case "center_control":
                return this.renderCenterControlPreview();
      case "space":
                return this.renderSpacePreview();
      case "outpost":
                return this.renderOutpostPreview();
      case "weak_squares":
                return this.renderWeakSquaresPreview();
      case "king_safety":
                return this.renderKingSafetyPreview();
      case "king_tropism":
                return this.renderKingTropismPreview();
      case "battery":
                return this.renderBatteryPreview();
      case "development":
                return this.renderDevelopmentPreview();
      case "rook_file":
                return this.renderRookFilePreview();
      case "piece_distance":
                return this.renderPieceDistancePreview();
      case "check":
                return this.renderCheckPreview();
      case "global":
                return this.renderGlobalPreview();
            default:
                return null;
        }
    }
    
    /**
     * Piece selector preview: shows a row of piece silhouettes
     */
    renderPieceSelectorPreview() {
    // Simple row of piece silhouettes using the minimal grid
    const pieces = { "0,0": "P", "0,1": "N", "0,2": "B", "0,3": "R", "0,4": "Q" };
    return this.createMinimalGrid(1, 5, pieces, new Set());
    }
    
    /**
     * Toggle grid preview: shows mini 8x8 with highlighted squares
     */
    renderToggleGridPreview() {
    // 4x4 minimal grid with some squares highlighted to show selection
    const highlights = new Set(["1,1", "1,2", "2,1", "2,2"]);
    return this.createMinimalGrid(4, 4, {}, highlights);
    }
    
    /**
   * King zone preview: king with surrounding squares highlighted
     */
    renderKingZonePreview() {
    // 3x3 grid with king in center, surrounding squares highlighted
    const pieces = { "1,1": "K" };
    const highlights = new Set(["0,0", "0,1", "0,2", "1,0", "1,2", "2,0", "2,1", "2,2"]);
    return this.createMinimalGrid(3, 3, pieces, highlights);
  }

  /**
   * Pawn formation preview: diagonal pawn chain
     */
    renderPawnFormationPreview() {
    // 3x3 grid with pawns in a diagonal chain, no highlights
    const pieces = { "0,2": "P", "1,1": "P", "2,0": "P" };
    return this.createMinimalGrid(3, 3, pieces, new Set());
    }
    
    /**
     * Helper: Create a mini chess board with specified dimensions
     * @param {number} rows - Number of rows
     * @param {number} cols - Number of columns
     * @param {Object} options - { pieces: {square: piece}, highlights: {square: class}, startFile: 0, startRank: 0 }
     */
    createMiniBoard(rows, cols, options = {}) {
    const {
      pieces = {},
      highlights = {},
      startFile = 0,
      startRank = 0,
      showCoords = false,
    } = options;

    const container = document.createElement("div");
    container.className = "target-preview-board";
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        
        // Unicode chess pieces
        const pieceSymbols = {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙",
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟",
        };
        
        for (let r = rows - 1; r >= 0; r--) {
            for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
                const actualFile = startFile + c;
                const actualRank = startRank + r;
                const isLight = (actualFile + actualRank) % 2 === 1;
        cell.className = `mini-cell ${isLight ? "light" : "dark"}`;
                
                const square = String.fromCharCode(97 + actualFile) + (actualRank + 1);
                
                // Apply highlight class if present
                if (highlights[square]) {
                    cell.classList.add(highlights[square]);
                }
                
                // Add piece if present
                if (pieces[square]) {
                    const piece = pieces[square];
                    cell.textContent = pieceSymbols[piece] || piece;
          cell.classList.add("has-piece");
        }

        container.appendChild(cell);
      }
    }

    return container;
  }

  /**
   * Helper: Create a minimal transparent grid with white lines
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @param {Object} pieces - Map of "row,col" to piece letter (uppercase=white, lowercase=black/hollow)
   * @param {Set} highlights - Set of "row,col" strings to highlight
   */
  createMinimalGrid(rows, cols, pieces = {}, highlights = new Set()) {
    const container = document.createElement("div");
    container.className = "preview-grid";
    container.setAttribute("data-rows", rows);
    container.setAttribute("data-cols", cols);

    const pieceClassMap = {
      K: "piece-king", Q: "piece-queen", R: "piece-rook",
      B: "piece-bishop", N: "piece-knight", P: "piece-pawn"
    };

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = document.createElement("div");
        cell.className = "preview-cell";

        // Add highlight
        if (highlights.has(`${row},${col}`)) {
          cell.classList.add("preview-cell-highlight");
        }

        // Add grid lines
        if (col < cols - 1) cell.style.borderRight = "1px solid rgba(255, 255, 255, 0.4)";
        if (row < rows - 1) cell.style.borderBottom = "1px solid rgba(255, 255, 255, 0.4)";

        // Add piece
        const pieceType = pieces[`${row},${col}`];
        if (pieceType) {
          const piece = document.createElement("div");
          const isHollow = pieceType === pieceType.toLowerCase();
          const pieceClass = pieceClassMap[pieceType.toUpperCase()] || "";
          piece.className = `preview-piece ${pieceClass}${isHollow ? " piece-hollow" : ""}`;
          cell.appendChild(piece);
                }
                
                container.appendChild(cell);
            }
        }
        
        return container;
    }
    
  /**
   * Create a minimal grid with an additional "capture" highlight for one square
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @param {Object} pieces - Object mapping "row,col" to piece type (e.g., "N", "P")
   * @param {Set} highlights - Set of "row,col" strings to highlight
   * @param {string} captureSquare - "row,col" string for the capture square (stronger highlight)
   */
  createMinimalGridWithCapture(rows, cols, pieces = {}, highlights = new Set(), captureSquare = null) {
    const container = document.createElement("div");
    container.className = "preview-grid";
    container.setAttribute("data-rows", rows);
    container.setAttribute("data-cols", cols);

    const pieceClassMap = {
      K: "piece-king", Q: "piece-queen", R: "piece-rook",
      B: "piece-bishop", N: "piece-knight", P: "piece-pawn"
    };

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = document.createElement("div");
        cell.className = "preview-cell";
        const key = `${row},${col}`;

        // Add highlight - capture square gets stronger highlight
        if (key === captureSquare) {
          cell.classList.add("preview-cell-capture");
        } else if (highlights.has(key)) {
          cell.classList.add("preview-cell-highlight");
        }

        // Add grid lines
        if (col < cols - 1) cell.style.borderRight = "1px solid rgba(255, 255, 255, 0.4)";
        if (row < rows - 1) cell.style.borderBottom = "1px solid rgba(255, 255, 255, 0.4)";

        // Add piece
        const pieceType = pieces[key];
        if (pieceType) {
          const piece = document.createElement("div");
          const isHollow = pieceType === pieceType.toLowerCase();
          const pieceClass = pieceClassMap[pieceType.toUpperCase()] || "";
          piece.className = `preview-piece ${pieceClass}${isHollow ? " piece-hollow" : ""}`;
          cell.appendChild(piece);
        }
                
        container.appendChild(cell);
      }
    }
        
    return container;
  }
    
    // ============================================
    // TARGET PREVIEW RENDERERS
    // ============================================
    
    /**
     * Material preview: shows piece icons with count indicators
     */
    renderMaterialPreview() {
    const container = document.createElement("div");
    container.className = "target-preview material-preview";
        
    const pieces = ["♙", "♘", "♗", "♖", "♕"];
        pieces.forEach((piece, idx) => {
      const item = document.createElement("div");
      item.className = "material-piece";
            item.textContent = piece;
      if (idx === 1) item.classList.add("highlighted"); // Highlight knight as example
            container.appendChild(item);
        });
        
        return container;
    }
    
    /**
   * Bishop pair preview: two bishops
     */
    renderBishopPairPreview() {
    // 2x2 grid with two bishops
    const pieces = { "0,0": "B", "1,1": "B" };
    return this.createMinimalGrid(2, 2, pieces, new Set());
  }

  /**
   * Mobility preview: 5x5 transparent grid with white lines, knight in center,
   * and subtle white highlights showing squares the knight can reach
     */
    renderMobilityPreview() {
    // 5x5 grid with knight in center, all legal moves highlighted,
    // and a pawn on one of the legal move squares with a stronger highlight
    const pieces = { "2,2": "N", "0,3": "P" }; // Knight in center, pawn at one legal move square
    
    // All knight move squares from center (2,2)
    const highlights = new Set([
      "0,1", "0,3",  // up 2
      "1,0", "1,4",  // up 1
      "3,0", "3,4",  // down 1
      "4,1", "4,3"   // down 2
    ]);
    
    // The pawn square gets a stronger highlight (capture square)
    const captureSquare = "0,3";
    
    return this.createMinimalGridWithCapture(5, 5, pieces, highlights, captureSquare);
    }
    
    /**
     * Defense preview: piece defended by pawn
     */
    renderDefensePreview() {
    // 3x3 grid with knight in middle row, pawns at bottom corners
    // 3x3 grid with knight in middle row, pawns at bottom corners, highlight knight
    const pieces = { "1,1": "N", "2,0": "P", "2,2": "P" };
    const highlights = new Set(["1,1"]);
    return this.createMinimalGrid(3, 3, pieces, highlights);
    }
    
    /**
     * Pawn advancement preview: pawn with path ahead
     */
    renderPawnAdvancementPreview() {
    // 4x1 vertical column with pawn and highlighted path
    const pieces = { "3,0": "P" };
    const highlights = new Set(["0,0", "1,0", "2,0"]);
    return this.createMinimalGrid(4, 1, pieces, highlights);
    }
    
    /**
     * Pawn structure preview: connected pawns
     */
    renderPawnStructurePreview() {
    // 3x3 grid with diagonal pawns, no highlights
    const pieces = { "0,2": "P", "1,1": "P", "2,0": "P" };
    return this.createMinimalGrid(3, 3, pieces, new Set());
    }
    
    /**
     * Passed pawn preview: pawn with clear path
     */
    renderPassedPawnPreview() {
    // 4x1 vertical grid with pawn and highlighted path ahead
    const pieces = { "3,0": "P" };
    const highlights = new Set(["0,0", "1,0", "2,0"]);
    return this.createMinimalGrid(4, 1, pieces, highlights);
    }
    
    /**
     * Pawn chain preview: diagonal chain (hidden)
     */
    renderPawnChainPreview() {
    // 3x3 grid with pawns in diagonal, no highlights
    const pieces = { "0,2": "P", "1,1": "P", "2,0": "P" };
    return this.createMinimalGrid(3, 3, pieces, new Set());
    }
    
    /**
     * Center control preview: 4 center squares highlighted
     */
    renderCenterControlPreview() {
    // 4x4 grid with center 4 squares highlighted
    const highlights = new Set(["1,1", "1,2", "2,1", "2,2"]);
    return this.createMinimalGrid(4, 4, {}, highlights);
    }
    
    /**
     * Space advantage preview: territory control
     */
    renderSpacePreview() {
    // 4x4 grid with top 2 rows highlighted
    const pieces = { "2,1": "P", "2,2": "P" };
    const highlights = new Set(["0,0", "0,1", "0,2", "0,3", "1,0", "1,1", "1,2", "1,3"]);
    return this.createMinimalGrid(4, 4, pieces, highlights);
    }
    
    /**
     * Outpost preview: knight on protected square
     */
    renderOutpostPreview() {
    // 3x3 grid with knight in center, supporting pawns below
    const pieces = { "0,1": "N", "1,0": "P", "1,2": "P" };
    const highlights = new Set(["0,1"]);
    return this.createMinimalGrid(3, 3, pieces, highlights);
    }
    
    /**
     * Weak squares preview: holes in pawn structure
     */
    renderWeakSquaresPreview() {
    // 3x3 grid showing hole between pawns
    const pieces = { "0,0": "p", "0,2": "p" };
    const highlights = new Set(["1,1"]); // The weak square
    return this.createMinimalGrid(3, 3, pieces, highlights);
    }
    
    /**
     * King safety preview: king with pawn shield
     */
    renderKingSafetyPreview() {
    // 3x3 grid with king and pawn shield
    const pieces = { "2,1": "K", "1,0": "P", "1,1": "P", "1,2": "P" };
    return this.createMinimalGrid(3, 3, pieces, new Set());
    }
    
    /**
     * King tropism preview: pieces near enemy king
     */
    renderKingTropismPreview() {
    // 4x4 grid with enemy king and attackers closing in
    const pieces = { "0,3": "k", "2,1": "N", "3,2": "Q" };
    const highlights = new Set(["1,2", "1,3"]); // Squares near king
    return this.createMinimalGrid(4, 4, pieces, highlights);
    }
    
    /**
   * Battery preview: Q+B diagonal battery targeting castled king
     */
    renderBatteryPreview() {
    // 5x5 grid: Q+B diagonal battery targeting castled king, no highlights
    const pieces = {
      "0,2": "r", "0,3": "k",           // Castled king (hollow)
      "1,2": "p", "1,3": "p", "1,4": "p", // Pawn shield (hollow)
      "3,1": "Q",                         // Queen
      "4,0": "B"                          // Bishop
    };
    return this.createMinimalGrid(5, 5, pieces, new Set());
    }
    
    /**
     * Development preview: pieces moved from starting squares
     */
    renderDevelopmentPreview() {
    // 3x3 grid showing a developed knight
    const pieces = { "1,1": "N" };
    const highlights = new Set(["1,1"]);
    return this.createMinimalGrid(3, 3, pieces, highlights);
    }
    
    /**
     * Rook file preview: rook on open file
     */
    renderRookFilePreview() {
    // 5x1 vertical grid with rook at bottom, no highlights
    const pieces = { "4,0": "R" };
    return this.createMinimalGrid(5, 1, pieces, new Set());
    }
    
    /**
   * Piece distance preview: queen approaching enemy king
     */
    renderPieceDistancePreview() {
    // King with concentric circles showing proximity zones
    const container = document.createElement("div");
    container.className = "proximity-preview";
    
    // Concentric circles with decreasing opacity
    const circles = [
      { size: 60, opacity: 0.15 },
      { size: 45, opacity: 0.25 },
      { size: 30, opacity: 0.4 },
    ];
    
    circles.forEach(({ size, opacity }) => {
      const circle = document.createElement("div");
      circle.className = "proximity-circle";
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.background = `rgba(255, 255, 255, ${opacity})`;
      container.appendChild(circle);
    });
    
    // King in center
    const king = document.createElement("div");
    king.className = "preview-piece piece-king proximity-king";
    container.appendChild(king);
    
    return container;
    }
    
  /**
   * Check preview: queen giving check to king with red attack line
     */
    renderCheckPreview() {
    // Custom grid with red highlights for check
    const container = document.createElement("div");
    container.className = "preview-grid check-preview";
    container.setAttribute("data-rows", "1");
    container.setAttribute("data-cols", "4");

    const pieceClassMap = { Q: "piece-queen", K: "piece-king" };
    const layout = ["Q", null, null, "k"];
    const redSquares = new Set([1, 2]); // Attack line squares

    layout.forEach((piece, col) => {
      const cell = document.createElement("div");
      cell.className = "preview-cell";
      
      // Red highlight for attack squares
      if (redSquares.has(col)) {
        cell.classList.add("preview-cell-danger");
      }
      // Red highlight for king being checked
      if (col === 3) {
        cell.classList.add("preview-cell-checked");
      }
      
      if (col < 3) cell.style.borderRight = "1px solid rgba(255, 255, 255, 0.4)";

      if (piece) {
        const pieceEl = document.createElement("div");
        const isHollow = piece === piece.toLowerCase();
        pieceEl.className = `preview-piece ${pieceClassMap[piece.toUpperCase()]}${isHollow ? " piece-hollow" : ""}`;
        cell.appendChild(pieceEl);
      }

      container.appendChild(cell);
    });

    return container;
    }
    
    /**
     * Global/position bonus preview: simple bonus indicator
     */
    renderGlobalPreview() {
    const container = document.createElement("div");
    container.className = "target-preview global-preview";
        container.innerHTML = '<span class="bonus-badge">+cp</span>';
        return container;
    }
    
    /**
     * Render full PST editor for active slot
     */
  renderPSTEditor(
    pieceType = "knight",
    preset = "simplified",
    paramValues = {},
  ) {
    const container = document.createElement("div");
    container.className = "pst-editor";

    // Preset info for help panel
    const presetInfo = {
      simplified:
        "Classic tables from chessprogramming.org. Well-balanced for general play.",
      pesto_mg: "PeSTO middlegame tables. Use with 'In middlegame' condition.",
      pesto_eg: "PeSTO endgame tables. Use with 'In endgame' condition.",
      development:
        "Opening-focused. Penalizes undeveloped pieces, rewards center control.",
      aggressive:
        "Forward-pushing. Rewards advanced pieces for attacking play.",
      defensive: "Safety-focused. Keeps pieces protected and coordinated.",
    };

    // Header row with piece selector and help button
    const headerRow = document.createElement("div");
    headerRow.className = "pst-header-row";

    const pieceRow = document.createElement("div");
    pieceRow.className = "pst-control-row";
    pieceRow.innerHTML = "<label>Piece:</label>";
    const pieceSelect = document.createElement("select");
    pieceSelect.className = "param-input pst-piece-select";
    pieceSelect.name = "pieceType";
    ["pawn", "knight", "bishop", "rook", "queen", "king"].forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
            opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            pieceSelect.appendChild(opt);
        });
    // Handle legacy king_opening/king_endgame
    let initPiece = paramValues.pieceType || pieceType;
    if (initPiece === "king_opening" || initPiece === "king_endgame")
      initPiece = "king";
    pieceSelect.value = initPiece;
        pieceRow.appendChild(pieceSelect);
    headerRow.appendChild(pieceRow);

    // Help button
    const helpBtn = document.createElement("button");
    helpBtn.type = "button";
    helpBtn.className = "pst-help-btn";
    helpBtn.innerHTML = '<i data-lucide="help-circle"></i>';
    helpBtn.title = "Help";
    headerRow.appendChild(helpBtn);
    container.appendChild(headerRow);
        
        // Preset selector
    const presetRow = document.createElement("div");
    presetRow.className = "pst-control-row";
    presetRow.innerHTML = "<label>Preset:</label>";
    const presetSelect = document.createElement("select");
    presetSelect.className = "param-input pst-preset-select";
    presetSelect.name = "preset";
    const presetOptions = [
      { value: "simplified", label: "Simplified (Classic)" },
      { value: "pesto_mg", label: "PeSTO Middlegame" },
      { value: "pesto_eg", label: "PeSTO Endgame" },
      { value: "development", label: "Development (Opening)" },
      { value: "aggressive", label: "Aggressive" },
      { value: "defensive", label: "Defensive" },
    ];
    presetOptions.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.value;
      opt.textContent = p.label;
            presetSelect.appendChild(opt);
        });
    presetSelect.value = paramValues.preset || preset || "simplified";
        presetRow.appendChild(presetSelect);
        container.appendChild(presetRow);

    // Help panel (hidden by default)
    const helpPanel = document.createElement("div");
    helpPanel.className = "pst-help-panel";
    helpPanel.style.display = "none";
    helpPanel.innerHTML = `
      <div class="pst-help-header">
        <strong>Piece-Square Tables</strong>
        <button type="button" class="pst-help-close"><i data-lucide="x"></i></button>
      </div>
      <p>For each piece on the board, outputs its <em>table value</em> (centipawns). Use <strong>Fixed: 1×</strong> in Value to apply directly.</p>
      <p><strong>Tip:</strong> Use "In middlegame/endgame" conditions for phase-specific PSTs.</p>
      <hr>
      <div class="pst-help-presets">
        <strong>Presets:</strong>
        ${presetOptions.map((p) => `<div class="pst-help-preset-item"><span class="pst-help-preset-name">${p.label}</span><span class="pst-help-preset-desc">${presetInfo[p.value] || ""}</span></div>`).join("")}
      </div>
    `;
    container.appendChild(helpPanel);

    helpBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      helpPanel.style.display =
        helpPanel.style.display === "none" ? "block" : "none";
      if (typeof lucide !== "undefined") lucide.createIcons();
    });
    helpPanel.querySelector(".pst-help-close").addEventListener("click", () => {
      helpPanel.style.display = "none";
    });
        
        // Grid visualization
    const gridContainer = document.createElement("div");
    gridContainer.className = "pst-grid";
        
        const presets = this.getPSTPresets();
    const currentPiece = pieceSelect.value;
    const currentPreset = paramValues.preset || preset || "simplified";
    const table =
      presets[currentPiece]?.[currentPreset] ||
      presets[currentPiece]?.simplified ||
      presets.knight.simplified;
        
        // File labels (a-h)
    const fileLabels = document.createElement("div");
    fileLabels.className = "pst-file-labels";
    "abcdefgh".split("").forEach((f) => {
      const label = document.createElement("span");
            label.textContent = f;
            fileLabels.appendChild(label);
        });
        gridContainer.appendChild(fileLabels);
        
        // Grid with rank labels
        for (let rank = 7; rank >= 0; rank--) {
      const row = document.createElement("div");
      row.className = "pst-row";
            
      const rankLabel = document.createElement("span");
      rankLabel.className = "pst-rank-label";
            rankLabel.textContent = rank + 1;
            row.appendChild(rankLabel);
            
            for (let file = 0; file < 8; file++) {
        const cell = document.createElement("div");
        cell.className = "pst-grid-cell";
                const value = table[7 - rank][file];
                
                // Color based on value
                const intensity = Math.min(Math.abs(value) / 50, 1);
                if (value > 0) {
                    cell.style.background = `rgba(34, 197, 94, ${intensity * 0.6})`;
                } else if (value < 0) {
                    cell.style.background = `rgba(239, 68, 68, ${intensity * 0.6})`;
                }
                
                cell.textContent = value;
                cell.title = `${String.fromCharCode(97 + file)}${rank + 1}: ${value} cp`;
                row.appendChild(cell);
            }
            
            gridContainer.appendChild(row);
        }
        
        container.appendChild(gridContainer);
        
    // Helper function to update grid cells
    const updateGrid = () => {
            const newPiece = pieceSelect.value;
      const selectedPreset = presetSelect.value || "simplified";
      const newTable =
        presets[newPiece]?.[selectedPreset] ||
        presets[newPiece]?.simplified ||
        presets.knight.simplified;
      const cells = gridContainer.querySelectorAll(".pst-grid-cell");
            let idx = 0;
            for (let rank = 7; rank >= 0; rank--) {
                for (let file = 0; file < 8; file++) {
                    const value = newTable[7 - rank][file];
                    const cell = cells[idx++];
                    const intensity = Math.min(Math.abs(value) / 50, 1);
                    if (value > 0) {
                        cell.style.background = `rgba(34, 197, 94, ${intensity * 0.6})`;
                    } else if (value < 0) {
                        cell.style.background = `rgba(239, 68, 68, ${intensity * 0.6})`;
                    } else {
            cell.style.background = "";
                    }
                    cell.textContent = value;
                    cell.title = `${String.fromCharCode(97 + file)}${rank + 1}: ${value} cp`;
                }
            }
    };

    // Update grid when piece type or preset changes
    pieceSelect.addEventListener("change", updateGrid);
    presetSelect.addEventListener("change", updateGrid);

    // Init lucide icons
    setTimeout(() => {
      if (typeof lucide !== "undefined") lucide.createIcons();
    }, 0);
        
        return container;
    }
    
    init() {
        this.renderCatalog();
        this.renderRulesList();
        this.renderCategoryWeights();
        this.bindEvents();
        this.loadFromStorage();
        
        // Global click handler to close tooltips
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".param-info-btn") &&
        !e.target.closest(".param-tooltip")
      ) {
        document
          .querySelectorAll(".param-tooltip.visible")
          .forEach((t) => t.classList.remove("visible"));
            }
        });
        
        // Reinitialize Lucide icons for dynamically created elements
    if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }
    
    renderCatalog() {
      // Render classic presets section
      this.renderPresetsSection();
      
      // Render condition blocks (filter out hidden)
      const conditionsEl = document.getElementById("condition-blocks");
      conditionsEl.innerHTML = "";
      Object.values(this.catalog.conditions)
        .filter((block) => !block.hidden)
        .forEach((block) => {
          conditionsEl.appendChild(this.createBlockElement(block, "condition"));
        });

      // Render target blocks (filter out hidden)
      const targetsEl = document.getElementById("target-blocks");
      targetsEl.innerHTML = "";
      Object.values(this.catalog.targets)
        .filter((block) => !block.hidden)
        .forEach((block) => {
          targetsEl.appendChild(this.createBlockElement(block, "target"));
        });

      // Render value blocks (filter out hidden)
      const valuesEl = document.getElementById("value-blocks");
      valuesEl.innerHTML = "";
      Object.values(this.catalog.values)
        .filter((block) => !block.hidden)
        .forEach((block) => {
          valuesEl.appendChild(this.createBlockElement(block, "value"));
        });

      // Reinitialize Lucide icons
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
    }
    
    renderPresetsSection() {
        // Presets are now shown in the Load modal, not in the sidebar
        // This method is kept for backwards compatibility but does nothing
    }
    
    createBlockElement(block, type) {
    const el = document.createElement("div");
        el.className = `block-item block-${type}`;
        el.dataset.blockId = block.id;
        el.dataset.blockType = type;
        el.draggable = true;
        
        // Use shared content renderer with preview=true (disabled fields)
        const content = this.renderBlockContent(block, type, { preview: true });
        el.appendChild(content);
        
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ type, id: block.id }),
      );
      el.classList.add("dragging");
            
            // Highlight the matching slot as a valid drop zone
            const matchingSlot = document.getElementById(`card-${type}`);
      if (matchingSlot && matchingSlot.classList.contains("empty")) {
        matchingSlot.classList.add("accepts-drop");
            }
            
            // Mark other slots as invalid drop zones
      ["condition", "target", "value"].forEach((slotType) => {
                if (slotType !== type) {
                    const otherSlot = document.getElementById(`card-${slotType}`);
                    if (otherSlot) {
            otherSlot.classList.add("drag-invalid");
                    }
                }
            });
        });
        
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
            
            // Remove all drag-related classes from slots
      ["condition", "target", "value"].forEach((slotType) => {
                const slot = document.getElementById(`card-${slotType}`);
                if (slot) {
          slot.classList.remove("accepts-drop", "drag-invalid", "drag-over");
                }
            });
        });
        
    el.addEventListener("click", () => {
            this.selectBlock(block, type);
        });
        
        return el;
    }
    
    selectBlock(block, type) {
        // Add block to current rule builder
        const slotEl = document.getElementById(`card-${type}`);
        this.setSlotContent(slotEl, block, type);
    }
    
    setSlotContent(slotEl, block, type, paramValues = {}) {
    slotEl.innerHTML = "";
    slotEl.classList.remove("empty", "required");
        slotEl.dataset.blockId = block.id;
        
        // Use shared content renderer with preview=false (active fields)
        const content = this.renderBlockContent(block, type, { 
            preview: false, 
      onRemove: () => this.clearSlot(slotEl, type),
      paramValues: paramValues,
        });
        slotEl.appendChild(content);
        
        // Reinitialize Lucide icons
    if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }
    
    /**
     * Unified block tile renderer - single source of truth for all tile contexts
     * @param {Object} block - The block definition
     * @param {string} type - Block type (condition, target, value)
     * @param {string} mode - 'preview' (sidebar), 'active' (slot), or 'compact' (rules list)
     * @param {Object} options - { onRemove: function, paramValues: object }
     */
  renderBlockTile(block, type, mode = "preview", options = {}) {
      const { onRemove = null, paramValues = {} } = options;

      const tile = document.createElement("div");
      tile.className = `block-tile block-tile-${mode} block-tile-${type}`;
      tile.dataset.blockId = block.id;
      tile.dataset.blockType = type;

      // Header row: icon + name + remove button
      const header = document.createElement("div");
      header.className = "block-tile-header";

      const iconSpan = document.createElement("span");
      iconSpan.className = "block-tile-icon";
      iconSpan.innerHTML = `<i data-lucide="${block.icon}"></i>`;
      header.appendChild(iconSpan);

      const nameSpan = document.createElement("span");
      nameSpan.className = "block-tile-name";
      nameSpan.textContent = block.name;
      header.appendChild(nameSpan);

      // Remove button for active mode
      if (mode === "active" && onRemove) {
        const removeBtn = document.createElement("button");
        removeBtn.className = "block-tile-remove";
        removeBtn.title = "Remove";
        removeBtn.innerHTML = '<i data-lucide="x"></i>';
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onRemove();
        });
        header.appendChild(removeBtn);
      }

      tile.appendChild(header);

      // Body: description for preview, editable params for active, summary for compact
      const body = document.createElement("div");
      body.className = "block-tile-body";

      if (mode === "preview") {
        // Preview mode: show description and visual hint
        if (block.specialRenderer) {
          const preview = this.renderTargetPreview(block.specialRenderer);
          if (preview) {
            body.appendChild(preview);
          }
        }
        const desc = document.createElement("div");
        desc.className = "block-tile-desc";
        desc.textContent = block.description || "";
        body.appendChild(desc);
      } else if (mode === "active") {
        // Active mode: show editable sentence/params
        if (block.specialRenderer === "pst") {
          // PST gets the full grid editor
          const pstEditor = this.renderPSTEditor(
            paramValues.pieceType || "knight",
          paramValues.preset || "simplified",
            paramValues,
          );
          body.appendChild(pstEditor);
        } else if (block.specialRenderer === "piece_selector") {
          // Piece selector for piece_count
          const pieceSelector = this.renderPieceSelector(
            paramValues.pieceType || "pawn",
            null,
            true, // include pairs
          );
          body.appendChild(pieceSelector);
          // Add sentence after piece selector
          if (block.sentence) {
            const sentenceEl = this.renderActiveSentenceWithoutPieceType(
              block,
              paramValues,
            );
            body.appendChild(sentenceEl);
          }
        } else if (block.specialRenderer === "toggle_grid") {
          // Toggle grid for square_control and piece_placement
          // First render piece type selector if it has one
          const pieceParam = block.params.find((p) => p.name === "pieceType");
          if (pieceParam) {
            const selectWrapper = document.createElement("div");
            selectWrapper.className = "grid-piece-select-wrapper";
            const label = document.createElement("span");
            label.className = "grid-piece-label";
            label.textContent = "Piece: ";
            selectWrapper.appendChild(label);
            const select = document.createElement("select");
            select.className = "param-input grid-piece-select";
            select.name = "pieceType";
            pieceParam.options.forEach((opt, idx) => {
              const option = document.createElement("option");
            option.value = (pieceParam.optionValues || pieceParam.options)[idx];
              option.textContent = opt;
              select.appendChild(option);
            });
            if (paramValues.pieceType) select.value = paramValues.pieceType;
            selectWrapper.appendChild(select);
            body.appendChild(selectWrapper);
          }
          // Render the toggle grid
          const presets = this.getSquarePresets(block.gridType || "control");
          const squares = paramValues.squares
            ? Array.isArray(paramValues.squares)
              ? paramValues.squares
              : JSON.parse(paramValues.squares)
            : [];
          const toggleGrid = this.renderToggleGrid(
            new Set(squares),
            presets,
            null,
            true, // start expanded
          );
          body.appendChild(toggleGrid);
        } else if (block.sentence) {
          const sentenceEl = this.renderActiveSentence(block, paramValues);
          body.appendChild(sentenceEl);
        } else if (block.description) {
          const desc = document.createElement("div");
          desc.className = "block-tile-desc";
          desc.textContent = block.description;
          body.appendChild(desc);
        }
      } else if (mode === "compact") {
        // Compact mode: one-line summary
        const summary = document.createElement("div");
        summary.className = "block-tile-summary";
        summary.textContent = this.getBlockSummary(block, paramValues);
        body.appendChild(summary);
      }

      tile.appendChild(body);

      return tile;
    }
    
    /**
     * Render editable sentence for active mode
     */
    renderActiveSentence(block, paramValues = {}) {
    const sentenceEl = document.createElement("div");
    sentenceEl.className = "block-tile-sentence";
        
        const paramMap = {};
    block.params.forEach((p) => (paramMap[p.name] = p));

    block.sentence.forEach((part) => {
      if (typeof part === "string") {
        const span = document.createElement("span");
        span.className = "sentence-text";
                span.textContent = part;
                sentenceEl.appendChild(span);
            } else if (part.param) {
                const param = paramMap[part.param];
                if (param) {
          const wrapper = document.createElement("span");
          wrapper.className = "sentence-input-wrap";
                    const input = this.createActiveInput(param, paramValues[param.name], {
            suffix: part.suffix || "",
            pluralize: part.pluralize || false,
                    });
                    wrapper.appendChild(input);
                    sentenceEl.appendChild(wrapper);
                }
            }
        });
        
        return sentenceEl;
    }
    
    /**
     * Render sentence without pieceType parameter (handled by piece selector)
     */
    renderActiveSentenceWithoutPieceType(block, paramValues = {}) {
    const sentenceEl = document.createElement("div");
    sentenceEl.className = "block-tile-sentence sentence-after-selector";
        
        const paramMap = {};
    block.params.forEach((p) => (paramMap[p.name] = p));

    block.sentence.forEach((part) => {
      if (typeof part === "string") {
        const span = document.createElement("span");
        span.className = "sentence-text";
                span.textContent = part;
                sentenceEl.appendChild(span);
            } else if (part.param) {
                // Skip pieceType - it's handled by the visual selector
        if (part.param === "pieceType") return;
                
                const param = paramMap[part.param];
                if (param) {
          const wrapper = document.createElement("span");
          wrapper.className = "sentence-input-wrap";
                    const input = this.createActiveInput(param, paramValues[param.name], {
            suffix: part.suffix || "",
            pluralize: part.pluralize || false,
                    });
                    wrapper.appendChild(input);
                    sentenceEl.appendChild(wrapper);
                }
            }
        });
        
        return sentenceEl;
    }
    
    /**
     * Create an active (editable) input for a parameter
     */
    createActiveInput(param, currentValue = null, partOptions = {}) {
    const { suffix = "", pluralize = false } = partOptions;
        let input;
        
    if (param.type === "piece-select") {
      // Custom piece dropdown with icons
      const wrapper = document.createElement("div");
      wrapper.className = "piece-dropdown-wrapper";
      
      const select = document.createElement("select");
      select.className = "piece-dropdown param-input";
      select.name = param.name;
      
      const displayOptions = param.options;
      const valueOptions = param.optionValues || param.options;
      
      displayOptions.forEach((opt, idx) => {
        const option = document.createElement("option");
        option.value = valueOptions[idx];
        // Format display name nicely
        let displayText = opt.replace(/_/g, ' ');
        displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
        option.textContent = displayText;
        option.dataset.piece = valueOptions[idx];
        select.appendChild(option);
      });
      
      // Set current value if provided
      if (currentValue !== null && currentValue !== undefined) {
        select.value = currentValue;
      }
      
      wrapper.appendChild(select);
      
      // Add piece icon indicator
      const iconSpan = document.createElement("span");
      iconSpan.className = "piece-dropdown-icon";
      const initialPiece = currentValue || (valueOptions[0] || '').split('_')[0];
      iconSpan.dataset.piece = initialPiece;
      wrapper.appendChild(iconSpan);
      
      // Update icon on change
      select.addEventListener("change", () => {
        const pieceValue = select.value;
        iconSpan.dataset.piece = pieceValue.split('_')[0];
      });
      
      return wrapper;
    } else if (param.type === "select") {
      input = document.createElement("select");
      input.className = "sentence-select param-input";
            
            const displayOptions = param.options;
            const valueOptions = param.optionValues || param.options;
      const isPieceParam =
        param.name.toLowerCase().includes("piece") ||
        param.name.toLowerCase().includes("type");
      const formatContext = isPieceParam ? "piece" : null;
            
            displayOptions.forEach((opt, idx) => {
        const option = document.createElement("option");
                option.value = valueOptions[idx];
                let displayText = this.formatOption(opt, formatContext);
        if (
          pluralize &&
          opt !== "any" &&
          !opt.endsWith("s") &&
          displayText !== "piece"
        ) {
          displayText += "s";
        } else if (pluralize && opt === "any") {
          displayText = "pieces";
                }
                option.textContent = displayText + suffix;
                input.appendChild(option);
            });
            
            // Set current value if provided
            if (currentValue !== null && currentValue !== undefined) {
                input.value = currentValue;
            }
    } else if (param.type === "formula") {
      input = document.createElement("input");
      input.type = "text";
      input.className = "sentence-formula param-input";
      input.placeholder = param.placeholder || "n * 10";
      input.value =
        currentValue !== null ? currentValue : param.default || "n * 10";
            input.name = param.name;
            
      input.addEventListener("input", () => {
                const result = this.validateFormula(input.value);
                if (result.valid) {
          input.classList.remove("invalid");
                    input.title = `Preview: n=4 → ${result.preview}`;
                } else {
          input.classList.add("invalid");
                    input.title = result.error;
                }
            });
      setTimeout(() => input.dispatchEvent(new Event("input")), 0);
            return input;
        } else {
            // Number input
      input = document.createElement("input");
      input.type = "number";
      input.className = "sentence-number param-input";
            input.min = param.min ?? -1000;
            input.max = param.max ?? 1000;
            input.step = param.step ?? 1;
      input.value =
        currentValue !== null
          ? currentValue
          : (param.default ?? param.min ?? 0);
      const maxDigits = Math.max(
        String(param.min ?? 0).length,
        String(param.max ?? 100).length,
      );
            input.style.width = `${maxDigits + 1.5}em`;
        }
        
        input.name = param.name;
        return input;
    }
    
    /**
     * Get a one-line summary of a block with its parameters
     */
    getBlockSummary(block, paramValues = {}) {
        if (!block.sentence) return block.name;
        
    let summary = "";
        const paramMap = {};
    block.params.forEach((p) => (paramMap[p.name] = p));

    block.sentence.forEach((part) => {
      if (typeof part === "string") {
        summary += part + " ";
            } else if (part.param) {
                const param = paramMap[part.param];
                if (param && paramValues[param.name] !== undefined) {
          summary += paramValues[param.name] + " ";
                } else if (param && param.default !== undefined) {
          summary += param.default + " ";
                } else {
          summary += "… ";
                }
            }
        });
        
        return summary.trim();
    }
    
    // Legacy wrapper for backward compatibility
    renderBlockContent(block, type, options = {}) {
        const { preview = false, onRemove = null, paramValues = {} } = options;
    const mode = preview ? "preview" : "active";
        return this.renderBlockTile(block, type, mode, { onRemove, paramValues });
    }
    
    /**
     * Render a semantic sentence with inline dropdowns
     */
    renderSentence(block, preview = false) {
    const sentenceEl = document.createElement("div");
    sentenceEl.className = `block-sentence${preview ? " preview" : ""}`;
        
        // Build param lookup
        const paramMap = {};
    block.params.forEach((p) => (paramMap[p.name] = p));
        
    block.sentence.forEach((part) => {
      if (typeof part === "string") {
                // Static text
        const span = document.createElement("span");
        span.className = "sentence-text";
                span.textContent = part;
                sentenceEl.appendChild(span);
            } else if (part.param) {
                // Parameter dropdown or input
                const param = paramMap[part.param];
                if (param) {
          const wrapper = document.createElement("span");
          wrapper.className = "sentence-input-wrap";
                    
                    // Pass part options (suffix, pluralize, etc.)
                    const input = this.createInlineInput(param, preview, {
            suffix: part.suffix || "",
            pluralize: part.pluralize || false,
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
    const { suffix = "", pluralize = false } = partOptions;
        let input;
        
    if (param.type === "piece-select") {
      // Custom piece dropdown with icons
      const wrapper = document.createElement("div");
      wrapper.className = "piece-dropdown-wrapper";
      
      const select = document.createElement("select");
      select.disabled = disabled;
      select.className = "piece-dropdown param-input";
      select.name = param.name;
      
      if (disabled) {
        const option = document.createElement("option");
        option.textContent = "—";
        select.appendChild(option);
      } else {
        const displayOptions = param.options;
        const valueOptions = param.optionValues || param.options;
        
        displayOptions.forEach((opt, idx) => {
          const option = document.createElement("option");
          option.value = valueOptions[idx];
          // Format display name nicely
          let displayText = opt.replace(/_/g, ' ');
          displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
          option.textContent = displayText;
          option.dataset.piece = valueOptions[idx];
          select.appendChild(option);
        });
      }
      
      wrapper.appendChild(select);
      
      // Add piece icon indicator
      if (!disabled) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "piece-dropdown-icon";
        const initialPiece = (param.optionValues || param.options)[0];
        iconSpan.dataset.piece = initialPiece.split('_')[0]; // Handle pairs like knight_pair
        wrapper.appendChild(iconSpan);
        
        // Update icon on change
        select.addEventListener("change", () => {
          const pieceValue = select.value;
          iconSpan.dataset.piece = pieceValue.split('_')[0];
        });
      }
      
      return wrapper;
    } else if (param.type === "select") {
      input = document.createElement("select");
            input.disabled = disabled;
      input.className = "sentence-select param-input"; // Include param-input for getSlotData
            
            if (disabled) {
                // Preview mode - show placeholder
        const option = document.createElement("option");
        option.textContent = "—";
                input.appendChild(option);
            } else {
                // Active mode - show all options
                const displayOptions = param.options;
                const valueOptions = param.optionValues || param.options;
                
                // Determine context for better display - piece-related params get 'piece' context
        const isPieceParam =
          param.name.toLowerCase().includes("piece") ||
          param.name.toLowerCase().includes("type");
        const formatContext = isPieceParam ? "piece" : null;
                
                displayOptions.forEach((opt, idx) => {
          const option = document.createElement("option");
                    option.value = valueOptions[idx];
                    // Smart formatting with context
                    let displayText = this.formatOption(opt, formatContext);
                    // Pluralize piece types (but not "piece" itself or already plural)
          if (
            pluralize &&
            opt !== "any" &&
            !opt.endsWith("s") &&
            displayText !== "piece"
          ) {
            displayText += "s";
          } else if (pluralize && opt === "any") {
            displayText = "pieces"; // "any" pluralizes to "pieces"
                    }
                    option.textContent = displayText + suffix;
                    input.appendChild(option);
                });
            }
    } else if (param.type === "formula") {
      input = document.createElement("input");
      input.type = "text";
            input.disabled = disabled;
      input.className = "sentence-formula param-input";
      input.placeholder = param.placeholder || "n * 10";
      input.value = disabled ? "" : param.default || "n * 10";
            input.name = param.name;
            
            if (!disabled) {
                // Add validation on input
        input.addEventListener("input", () => {
                    const result = this.validateFormula(input.value);
                    if (result.valid) {
            input.classList.remove("invalid");
                        input.title = `Preview: n=4 → ${result.preview}`;
                    } else {
            input.classList.add("invalid");
                        input.title = result.error;
                    }
                });
                // Trigger initial validation
        setTimeout(() => input.dispatchEvent(new Event("input")), 0);
            }
            
            return input;
        } else {
            // Number input
      input = document.createElement("input");
      input.type = "number";
            input.disabled = disabled;
      input.className = "sentence-number param-input";
            if (disabled) {
        input.placeholder = "—";
        input.style.width = "2.5em";
            } else {
                input.min = param.min ?? -1000;
                input.max = param.max ?? 1000;
                input.step = param.step ?? 1;
        input.value = param.default ?? param.min ?? 0;
                // Dynamic width based on value range
        const maxDigits = Math.max(
          String(param.min ?? 0).length,
          String(param.max ?? 100).length,
        );
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
    const wrapper = document.createElement("div");
    wrapper.className = `param-row${disabled ? " disabled" : ""}`;
        
        // Label
    const label = document.createElement("label");
        label.textContent = param.label;
        wrapper.appendChild(label);
        
        let input;
    if (param.type === "select") {
      input = document.createElement("select");
            input.disabled = disabled;
            if (disabled) {
                // Preview mode - show placeholder
        const option = document.createElement("option");
        option.textContent = "—";
                input.appendChild(option);
            } else {
                // Active mode - show all options
        param.options.forEach((opt) => {
          const option = document.createElement("option");
                    option.value = opt;
                    option.textContent = this.formatOption(opt);
                    input.appendChild(option);
                });
            }
    } else if (param.type === "formula") {
            if (disabled) {
                // Preview mode - simple disabled input
        input = document.createElement("input");
        input.type = "text";
                input.disabled = true;
        input.placeholder = "formula";
        input.className = "param-input formula-input";
            } else {
                // Active mode - formula input with validation
        const formulaWrapper = document.createElement("div");
        formulaWrapper.className = "formula-input-wrapper";

        const inputRow = document.createElement("div");
        inputRow.className = "formula-input-row";

        input = document.createElement("input");
        input.type = "text";
        input.placeholder = param.placeholder || "n * 10";
        input.value = param.default || "n * 10";
                input.name = param.name;
        input.className = "param-input formula-input";
                
                // Info button with tooltip
        const infoBtn = document.createElement("button");
        infoBtn.type = "button";
        infoBtn.className = "formula-info-btn";
                infoBtn.innerHTML = '<i data-lucide="info"></i>';
        infoBtn.title = "Formula examples";
                
        const tooltip = document.createElement("div");
        tooltip.className = "formula-tooltip";
                tooltip.innerHTML = `
                    <div class="tooltip-title">Formula Examples</div>
                    <div class="tooltip-item"><code>n * 10</code> — 10 cp per unit</div>
                    <div class="tooltip-item"><code>10 * sqrt(n)</code> — diminishing returns</div>
                    <div class="tooltip-item"><code>n^2 / 10</code> — accelerating</div>
                    <div class="tooltip-item"><code>100 * log(n + 1)</code> — logarithmic</div>
                    <div class="tooltip-item"><code>-5 * n</code> — penalty</div>
                    <div class="tooltip-note">n = count from target</div>
                `;
                
        infoBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
          tooltip.classList.toggle("visible");
                });
                
        document.addEventListener("click", () => {
          tooltip.classList.remove("visible");
                });
                
                inputRow.appendChild(input);
                inputRow.appendChild(infoBtn);
                inputRow.appendChild(tooltip);
                
        const validationMsg = document.createElement("div");
        validationMsg.className = "formula-validation";
                
        input.addEventListener("input", () => {
                    const result = this.validateFormula(input.value);
                    if (result.valid) {
                        validationMsg.textContent = `✓ Preview: n=4 → ${result.preview}`;
            validationMsg.className = "formula-validation valid";
            input.classList.remove("invalid");
                    } else {
                        validationMsg.textContent = `✗ ${result.error}`;
            validationMsg.className = "formula-validation invalid";
            input.classList.add("invalid");
                    }
                });
                
                setTimeout(() => {
          input.dispatchEvent(new Event("input"));
          if (typeof lucide !== "undefined") {
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
      input = document.createElement("input");
      input.type = "number";
            input.disabled = disabled;
            if (disabled) {
        input.placeholder = "—";
            } else {
                input.min = param.min ?? -1000;
                input.max = param.max ?? 1000;
                input.step = param.step ?? 1;
        input.value = param.default ?? param.min ?? 0;
            }
        }
        
        input.name = param.name;
    input.className = "param-input";
        wrapper.appendChild(input);
        
        return wrapper;
    }
    
    // Validate a formula - ensure it only uses n and safe math operations
    validateFormula(formula) {
    if (!formula || formula.trim() === "") {
      return { valid: false, error: "Formula cannot be empty" };
        }
        
        // Check that 'n' appears at least once
        if (!/\bn\b/.test(formula)) {
      return {
        valid: false,
        error: "Formula must contain 'n' (the count variable)",
      };
        }
        
        // Whitelist of allowed tokens
    const allowedPattern =
      /^[\d\s\+\-\*\/\(\)\.\^n]*(sqrt|abs|log|ln|sin|cos|tan|floor|ceil|round|min|max|pow|exp)*[\d\s\+\-\*\/\(\)\.\^n]*$/i;
        
        // Remove allowed function names and check remaining chars
        const sanitized = formula
      .replace(
        /\b(sqrt|abs|log|ln|sin|cos|tan|floor|ceil|round|min|max|pow|exp)\b/gi,
        "",
      )
      .replace(/\bn\b/g, "")
      .replace(/[\d\s\+\-\*\/\(\)\.\^,]/g, "");
        
        if (sanitized.length > 0) {
      return {
        valid: false,
        error: `Invalid characters: ${sanitized.substring(0, 10)}`,
      };
        }
        
        // Try to evaluate with a test value
        try {
            const jsFormula = this.formulaToJS(formula);
      const testFn = new Function("n", `return ${jsFormula}`);
            const result = testFn(4);
            
      if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
        return {
          valid: false,
          error: "Formula does not produce a valid number",
        };
            }
            
            return { valid: true, preview: Math.round(result * 100) / 100 };
        } catch (e) {
      return { valid: false, error: "Invalid formula syntax" };
        }
    }
    
    // Convert formula to JavaScript-safe expression
    formulaToJS(formula) {
        return formula
      .replace(/\^/g, "**") // ^ to **
      .replace(/\bsqrt\b/gi, "Math.sqrt") // sqrt to Math.sqrt
      .replace(/\babs\b/gi, "Math.abs")
      .replace(/\blog\b/gi, "Math.log10") // log = log base 10
      .replace(/\bln\b/gi, "Math.log") // ln = natural log
      .replace(/\bsin\b/gi, "Math.sin")
      .replace(/\bcos\b/gi, "Math.cos")
      .replace(/\btan\b/gi, "Math.tan")
      .replace(/\bfloor\b/gi, "Math.floor")
      .replace(/\bceil\b/gi, "Math.ceil")
      .replace(/\bround\b/gi, "Math.round")
      .replace(/\bmin\b/gi, "Math.min")
      .replace(/\bmax\b/gi, "Math.max")
      .replace(/\bpow\b/gi, "Math.pow")
      .replace(/\bexp\b/gi, "Math.exp");
    }
    
    formatOption(opt, context = null) {
        // Special display mappings for more natural language
        const displayMap = {
      any: context === "piece" ? "piece" : "any",
      my: "My",
      opponent: "opponent's",
      both: "either",
      manhattan: "Manhattan",
      chebyshev: "Chebyshev",
        };
        
        if (displayMap[opt]) {
            return displayMap[opt];
        }
    return opt
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    }
    
    clearSlot(slotEl, type) {
        const placeholders = {
      condition: {
        label: "Condition",
        hint: "Click to choose",
        icon: "filter",
      },
      target: {
        label: "Target",
        hint: "Click to choose",
        icon: "crosshair",
      },
      value: { label: "Value", hint: "Click to set", icon: "calculator" },
        };
        const placeholder = placeholders[type] || {
          label: "Block",
          hint: "Click to add",
          icon: "plus",
        };

        // Restore the original HTML structure matching index.html
        slotEl.innerHTML = `
            <div class="card-empty">
                <i data-lucide="${placeholder.icon}" class="card-icon"></i>
                <span class="card-label">${placeholder.label}</span>
                <span class="card-hint">${placeholder.hint}</span>
            </div>
        `;
        slotEl.classList.add("empty", "required");
        delete slotEl.dataset.blockId;

        // Reinitialize Lucide icons for the new placeholder
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
    }
    
    renderRulesList() {
    const listEl = document.getElementById("rules-list");
    const countEl = document.getElementById("rules-count");
    listEl.innerHTML = "";
        
        // Update rules count
    const enabledCount = this.evaluator.rules.filter((r) => r.enabled).length;
        const totalCount = this.evaluator.rules.length;
        if (countEl) {
      countEl.textContent =
        totalCount > 0 ? `(${enabledCount}/${totalCount} active)` : "";
        }
        
        if (this.evaluator.rules.length === 0) {
      listEl.innerHTML =
        '<div class="empty-rules">No rules yet. Create one above!</div>';
            return;
        }
        
        // Render rule cards in grid
        this.evaluator.rules.forEach((rule, index) => {
          const ruleEl = document.createElement("div");
          ruleEl.className = `rule-item ${rule.enabled ? "enabled" : "disabled"}`;
          ruleEl.dataset.ruleId = rule.id;
          ruleEl.dataset.index = index + 1;
          ruleEl.dataset.category = rule.category || "positional";

          // Card header with name and number
          const headerEl = document.createElement("div");
          headerEl.className = "rule-card-header";

          const nameEl = document.createElement("span");
          nameEl.className = "rule-name";
          nameEl.textContent = rule.name || `Rule ${index + 1}`;
          headerEl.appendChild(nameEl);

          const numEl = document.createElement("span");
          numEl.className = "rule-number";
          numEl.textContent = `#${index + 1}`;
          headerEl.appendChild(numEl);

          ruleEl.appendChild(headerEl);

          // Rule description/preview
          const descEl = document.createElement("div");
          descEl.className = "rule-desc";
          descEl.innerHTML = this.getRulePreview(rule);
          ruleEl.appendChild(descEl);

          // Action buttons (visible on hover)
          const actionsEl = document.createElement("div");
          actionsEl.className = "rule-actions";
          actionsEl.innerHTML = `
                <button class="toggle-btn" title="${rule.enabled ? "Disable" : "Enable"}"><i data-lucide="${rule.enabled ? "eye-off" : "eye"}"></i></button>
                <button class="edit-btn" title="Edit"><i data-lucide="pencil"></i></button>
                <button class="delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
            `;
          ruleEl.appendChild(actionsEl);

          // Click on card to edit the rule
          ruleEl.addEventListener("click", (e) => {
            if (!e.target.closest(".rule-actions")) {
              this.editRule(rule);
            }
          });

          listEl.appendChild(ruleEl);

          // Bind action buttons after appending
      actionsEl.querySelector(".toggle-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              rule.enabled = !rule.enabled;
              this.saveToStorage();
              this.renderRulesList();
            });

      actionsEl.querySelector(".edit-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              this.editRule(rule);
            });

      actionsEl.querySelector(".delete-btn").addEventListener("click", (e) => {
              e.stopPropagation();
              this.deleteRule(rule.id);
            });
        });
        
        // Reinitialize Lucide icons
    if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }
    
    getRulePreview(rule) {
    let preview = "";
        
        // Condition
    if (rule.condition && rule.condition.type !== "always") {
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
        
    return preview || "Incomplete rule";
    }
    
    getRuleAbbrev(rule) {
        // Generate a short abbreviation based on target type
    if (!rule.target) return "???";
        
    let abbrev = "";
        const targetType = rule.target.type;
        
        switch (targetType) {
      case "simple_material":
        abbrev = rule.target.pieceType
          ? this.getPieceAbbrev(rule.target.pieceType)
          : "Mat";
                break;
      case "mobility":
        abbrev = rule.target.pieceType
          ? `${this.getPieceAbbrev(rule.target.pieceType)}Mob`
          : "Mob";
                break;
      case "defense":
        abbrev = rule.target.pieceType
          ? `Def${this.getPieceAbbrev(rule.target.pieceType)}`
          : "Def";
                break;
      case "piece_distance":
        abbrev = "Dist";
                break;
      case "pawn_advancement":
        abbrev = "PwnAdv";
                break;
      case "pawn_neighbors":
        abbrev = "PwnNbr";
                break;
      case "check":
        abbrev = "Check";
                break;
      case "global":
        abbrev = "Bonus";
                break;
      case "king_safety":
        abbrev = "KSafe";
                break;
            default:
                // For unknown types, create a readable abbreviation
                abbrev = targetType
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1, 3))
          .join("")
                    .substring(0, 6);
        }
        
        // Add condition hint if not "always"
    if (rule.condition && rule.condition.type !== "always") {
            const condAbbrevs = {
        game_phase: this.getPhaseAbbrev(rule.condition.phase),
        material: "Mat",
        castling: "Cast",
        piece_distance: "Dist",
      };
      const condHint = condAbbrevs[rule.condition.type] || "";
            if (condHint) {
                abbrev = `${condHint}:${abbrev}`;
            }
        }
        
        return abbrev;
    }
    
    getPieceAbbrev(pieceType) {
        const abbrevs = {
      pawn: "P",
      knight: "N",
      bishop: "B",
      rook: "R",
      queen: "Q",
      king: "K",
      any: "All",
        };
        return abbrevs[pieceType] || pieceType.charAt(0).toUpperCase();
    }
    
    getPhaseAbbrev(phase) {
        const abbrevs = {
      opening: "Op",
      middlegame: "Mid",
      endgame: "End",
      late_endgame: "Late",
    };
    return abbrevs[phase] || "";
    }
    
    getRuleValueShort(rule) {
    if (!rule.value) return "";
        
    if (rule.value.type === "fixed") {
            const val = rule.value.baseValue || 0;
            return val >= 0 ? `+${val}` : `${val}`;
    } else if (rule.value.type === "scaled") {
            return `×${rule.value.multiplier || 1}`;
    } else if (rule.value.type === "conditional") {
      return "Cond";
        }
    return "";
    }
    
    describeCondition(cond) {
        const block = this.catalog.conditions[cond.type];
        if (!block) return cond.type;
        
        switch (cond.type) {
      case "game_phase":
        return `In ${this.formatOption(cond.phase || "unknown")}`;
      case "material":
        return `${this.formatOption(cond.player || "")} has ${cond.comparison?.replace("_", " ")} ${cond.count} ${cond.pieceType}s`;
      case "castling":
        return `${this.formatOption(cond.player || "")} ${cond.status?.replace(/_/g, " ")}`;
      case "piece_distance":
        return `${cond.piece1Type} ${cond.comparison?.replace("_", " ")} ${cond.distance} from ${cond.piece2Type}`;
            default:
                return block.name;
        }
    }
    
    describeTarget(target) {
        const block = this.catalog.targets[target.type];
        if (!block) return target.type;
        
        switch (target.type) {
          case "simple_material":
            return `Each ${target.pieceType || "piece"}`;
          case "mobility":
            const capW =
              target.captureWeight && target.captureWeight !== 1
                ? ` (cap×${target.captureWeight})`
                : "";
            return `${this.formatOption(target.pieceType || "piece")} mobility${capW}`;
          case "defense":
            const defenderDesc =
              target.defenderType && target.defenderType !== "any"
                ? ` by ${target.defenderType}s`
                : "";
            return `Defended ${target.pieceType || "piece"}s${defenderDesc} (${target.minDefenders}+)`;
          case "piece_distance":
            return `${target.piece1Type}-${target.piece2Type} distance`;
          case "pawn_advancement":
            return "Pawn advancement";
          case "passed_pawn":
            return `Passed pawn ${target.measureType || "rank"}`;
          case "check":
            return "Giving check";
          case "global":
            return "Position";
          case "king_safety":
            return "King safety";
          case "rook_file":
            return `Rook on ${target.fileType || "open"} file`;
          case "center_control":
            return `Center control (${target.centerType || "core"})`;
          case "pawn_structure":
            return `${target.structureType || "doubled"} pawns`;
          case "development":
            return `${target.developType || "all_minors"}`;
          case "bishop_pair":
            return "Bishop pair";
          case "outpost":
            return `${target.pieceType || "piece"} outpost`;
          case "king_tropism":
            return `${target.pieceType || "piece"} king tropism`;
          default:
            return block ? block.name : target.type;
        }
    }
    
    describeValue(value) {
        switch (value.type) {
      case "fixed":
                const v = value.value || 0;
        return `${v >= 0 ? "+" : ""}${v} cp`;
      case "formula":
        const formula = value.formula || "n";
                // Clean up formula display - extract multiplier if simple "n * X" pattern
                const simpleMatch = formula.match(/^n\s*\*\s*(-?\d+)$/);
                if (simpleMatch) {
                    const mult = parseInt(simpleMatch[1]);
          return `${mult >= 0 ? "+" : ""}${mult} cp`;
                }
                return `f(n) = ${formula}`;
            default:
        return "value";
        }
    }
    
    renderCategoryWeights() {
    const container = document.getElementById("category-weights");
        if (!container) return;
    container.innerHTML = "";

    Object.entries(this.evaluator.categoryWeights).forEach(
      ([category, weight]) => {
        const row = document.createElement("div");
        row.className = "weight-row";
            
            row.innerHTML = `
                <label>${this.formatOption(category)}</label>
                <input type="range" min="0" max="200" value="${weight * 100}" 
                       data-category="${category}" class="weight-slider">
                <span class="weight-value">${weight.toFixed(1)}</span>
            `;
            
        row.querySelector(".weight-slider").addEventListener("input", (e) => {
                const newWeight = parseInt(e.target.value) / 100;
                this.evaluator.categoryWeights[category] = newWeight;
          row.querySelector(".weight-value").textContent = newWeight.toFixed(1);
                this.saveToStorage();
            });
            
            container.appendChild(row);
      },
    );
    }
    
    bindEvents() {
        // Drop zones
    ["condition", "target", "value"].forEach((type) => {
            const slot = document.getElementById(`card-${type}`);
            
      slot.addEventListener("dragover", (e) => {
                e.preventDefault();
        slot.classList.add("drag-over");
            });
            
      slot.addEventListener("dragleave", () => {
        slot.classList.remove("drag-over");
            });
            
      slot.addEventListener("drop", (e) => {
                e.preventDefault();
        slot.classList.remove("drag-over");
                
                try {
          const data = JSON.parse(e.dataTransfer.getData("application/json"));
                    if (data.type === type) {
            const block = this.catalog[type + "s"][data.id];
                        if (block) {
                            this.setSlotContent(slot, block, type);
                        }
                    }
                } catch (err) {}
            });
            
      slot.addEventListener("click", (e) => {
        if (slot.classList.contains("empty")) {
                    this.showBlockPicker(type, slot);
                }
            });
        });
        
        // Add rule button
    document.getElementById("add-rule-btn").addEventListener("click", () => {
            this.addCurrentRule();
        });
        
        // Clear builder button
    document
      .getElementById("clear-builder-btn")
      .addEventListener("click", () => {
            this.clearBuilder();
        });
        
        // Save evaluator button
    document.getElementById("save-eval-btn").addEventListener("click", () => {
            this.saveEvaluator();
        });
        
        // Load evaluator button
    document.getElementById("load-eval-btn").addEventListener("click", () => {
            this.showLoadDialog();
        });
        
        // Export JSON button
    document.getElementById("export-json-btn").addEventListener("click", () => {
            this.exportJson();
        });
        
        // Publish to leaderboard button
    document
      .getElementById("publish-eval-btn")
      ?.addEventListener("click", () => {
            this.publishToLeaderboard();
        });
        
        // Evaluator name input
    document
      .getElementById("eval-name-input")
      .addEventListener("change", (e) => {
            this.evaluator.name = e.target.value;
            this.saveToStorage();
        });
        
        // Template buttons
    document.querySelectorAll(".template-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
                this.loadTemplate(btn.dataset.template);
            });
        });
    }
    
    showBlockPicker(type, slot) {
      const modal = document.getElementById("block-picker-modal");
      const title = document.getElementById("block-picker-title");
      const grid = document.getElementById("block-picker-grid");
      const content = modal.querySelector(".modal-content");

      // Set title and type class
      const typeLabels = {
        condition: "Choose a Condition",
        target: "Choose a Target",
        value: "Choose a Value",
      };
      title.textContent = typeLabels[type] || "Choose a Block";

      // Remove old type classes and add new one
      content.classList.remove(
        "picker-condition",
        "picker-target",
        "picker-value",
      );
      content.classList.add(`picker-${type}`);

      // Get blocks for this type
      const blocks = Object.values(this.catalog[type + "s"] || {});

      // Clear and populate grid
      grid.innerHTML = "";
      blocks.forEach((block) => {
        const item = document.createElement("div");
        item.className = "block-picker-item";

        // Use the unified tile renderer in preview mode
        const tile = this.renderBlockTile(block, type, "preview", {});
        item.appendChild(tile);

        // Click to select
        item.addEventListener("click", () => {
          this.setSlotContent(slot, block, type);
          slot.classList.remove("empty");
          this.hideBlockPicker();
        });

        grid.appendChild(item);
      });

      // Reinitialize icons
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }

      // Show modal
      modal.style.display = "flex";

      // Bind close events
      const closeBtn = document.getElementById("block-picker-close");
      const closeHandler = () => this.hideBlockPicker();
      closeBtn.onclick = closeHandler;
      modal.onclick = (e) => {
        if (e.target === modal) closeHandler();
      };

      // Escape key to close
      const escHandler = (e) => {
        if (e.key === "Escape") {
          closeHandler();
          document.removeEventListener("keydown", escHandler);
        }
      };
      document.addEventListener("keydown", escHandler);
    }
    
    hideBlockPicker() {
    const modal = document.getElementById("block-picker-modal");
    modal.style.display = "none";
    }
    
    addCurrentRule() {
    const condSlot = document.getElementById("card-condition");
    const targetSlot = document.getElementById("card-target");
    const valueSlot = document.getElementById("card-value");
    const nameInput = document.getElementById("rule-name-input");
        
        // Validate all three slots
        if (!condSlot.dataset.blockId) {
      this.showNotification("Please select a condition for your rule", "error");
      condSlot.classList.add("shake");
      setTimeout(() => condSlot.classList.remove("shake"), 500);
            return;
        }
        
        if (!targetSlot.dataset.blockId) {
      this.showNotification("Please select a target for your rule", "error");
      targetSlot.classList.add("shake");
      setTimeout(() => targetSlot.classList.remove("shake"), 500);
            return;
        }
        
        if (!valueSlot.dataset.blockId) {
      this.showNotification("Please select a value for your rule", "error");
      valueSlot.classList.add("shake");
      setTimeout(() => valueSlot.classList.remove("shake"), 500);
            return;
        }
        
        // Determine if we're editing
        const isEditing = this.editingRule !== null;
        
        // Build rule
        const rule = {
            id: isEditing ? this.editingRule.id : `rule_${this.nextRuleId++}`,
      name: nameInput.value || "Unnamed Rule",
      enabled: isEditing ? this.editingRule.enabled : true, // Preserve enabled state when editing
      category:
        this.catalog.targets[targetSlot.dataset.blockId]?.category ||
        "positional",
      weight: 1.0,
        };
        
        // Condition
    rule.condition = this.getSlotData(condSlot, "condition");
        
        // Target
    rule.target = this.getSlotData(targetSlot, "target");
        
        // Value
    rule.value = this.getSlotData(valueSlot, "value");
        
        // Add or update
        if (isEditing) {
      const index = this.evaluator.rules.findIndex(
        (r) => r.id === this.editingRule.id,
      );
            if (index >= 0) {
                this.evaluator.rules[index] = rule;
            }
        } else {
            this.evaluator.rules.push(rule);
        }
        
        this.renderRulesList();
        this.clearBuilder();
        this.saveToStorage();
    this.showNotification(
      isEditing ? "Rule updated successfully!" : "Rule added successfully!",
      "success",
    );
    }
    
    getSlotData(slot, type) {
        const blockId = slot.dataset.blockId;
        const data = { type: blockId };
        
    slot.querySelectorAll(".param-input").forEach((input) => {
            let value = input.value;
      if (input.type === "number") {
                value = parseFloat(value);
            }
            data[input.name] = value;
        });
        
        return data;
    }
    
    editRule(rule) {
        this.editingRule = rule;
        
        // Update UI to show edit mode
    const addBtn = document.getElementById("add-rule-btn");
    const builder = document.querySelector(".rule-builder-section");
        addBtn.innerHTML = '<i data-lucide="check"></i> Update Rule';
    addBtn.classList.add("edit-mode");
    if (builder) builder.classList.add("edit-mode");
        
        // Populate builder with rule data
    document.getElementById("rule-name-input").value = rule.name;
        
        // Condition - pass rule.condition as paramValues to render with correct values
        if (rule.condition && this.catalog.conditions[rule.condition.type]) {
            const block = this.catalog.conditions[rule.condition.type];
      const slot = document.getElementById("card-condition");
      this.setSlotContent(slot, block, "condition", rule.condition);
        }
        
        // Target - pass rule.target as paramValues to render with correct values (especially for PST)
        if (rule.target && this.catalog.targets[rule.target.type]) {
            const block = this.catalog.targets[rule.target.type];
      const slot = document.getElementById("card-target");
      this.setSlotContent(slot, block, "target", rule.target);
        }
        
        // Value - pass rule.value as paramValues to render with correct values
        if (rule.value && this.catalog.values[rule.value.type]) {
            const block = this.catalog.values[rule.value.type];
      const slot = document.getElementById("card-value");
      this.setSlotContent(slot, block, "value", rule.value);
        }
        
        // Reinitialize Lucide icons for the button
    if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
        
        // Scroll to builder
    document
      .querySelector(".rule-builder")
      .scrollIntoView({ behavior: "smooth" });
    }
    
    populateSlotParams(slot, data) {
    slot.querySelectorAll(".param-input").forEach((input) => {
            if (data[input.name] !== undefined) {
                input.value = data[input.name];
            }
        });
    }
    
    deleteRule(ruleId) {
    this.evaluator.rules = this.evaluator.rules.filter((r) => r.id !== ruleId);
        this.renderRulesList();
        this.saveToStorage();
    this.showNotification("Rule deleted", "info");
    }
    
    clearBuilder() {
        this.editingRule = null;
    document.getElementById("rule-name-input").value = "";
        
        // Reset button and builder from edit mode
    const addBtn = document.getElementById("add-rule-btn");
    const builder = document.querySelector(".rule-builder-section");
        addBtn.innerHTML = '<i data-lucide="plus"></i> Add Rule';
    addBtn.classList.remove("edit-mode");
    if (builder) builder.classList.remove("edit-mode");
        
        // Reinitialize Lucide icons for the button
    if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
        
    ["condition", "target", "value"].forEach((type) => {
            const slot = document.getElementById(`card-${type}`);
            this.clearSlot(slot, type);
        });
    }
    
    saveToStorage() {
        try {
      localStorage.setItem(
        "chess_eval_builder",
        JSON.stringify(this.evaluator),
      );
        } catch (e) {}
    }
    
    loadFromStorage() {
        try {
      const saved = localStorage.getItem("chess_eval_builder");
            if (saved) {
                const data = JSON.parse(saved);
                this.evaluator = { ...this.evaluator, ...data };
        this.nextRuleId =
          Math.max(
            ...this.evaluator.rules.map(
              (r) => parseInt(r.id.replace("rule_", "")) || 0,
            ),
            0,
          ) + 1;

        document.getElementById("eval-name-input").value = this.evaluator.name;
                this.renderRulesList();
                this.renderCategoryWeights();
            }
        } catch (e) {}
    }
    
    saveEvaluator() {
        // Show confirmation modal instead of prompt
    this.showConfirmModal("save");
    }
    
    // Perform the actual save after modal confirmation
    doSaveEvaluator() {
        const name = this.evaluator.name;
        
        // Save to localStorage list
        try {
      const saved = JSON.parse(
        localStorage.getItem("chess_saved_evals") || "{}",
      );
            saved[name] = this.evaluator;
      localStorage.setItem("chess_saved_evals", JSON.stringify(saved));
      this.showNotification(`Saved "${name}"`, "success");
        } catch (e) {
      this.showNotification("Failed to save", "error");
        }
    }
    
    showLoadDialog() {
        // Create or get the load modal
        let modal = document.getElementById("load-preset-modal");
        
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "load-preset-modal";
            modal.className = "eval-modal";
            document.body.appendChild(modal);
        }
        
        // Get saved evaluators
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem("chess_saved_evals") || "{}");
        } catch (e) {}
        const savedNames = Object.keys(saved);
        
        // Build modal content
        modal.innerHTML = `
            <div class="eval-modal-backdrop"></div>
            <div class="eval-modal-content load-modal-content">
                <div class="eval-modal-header">
                    <h2><i data-lucide="library"></i> Templates & Saved</h2>
                    <button class="eval-modal-close" id="load-modal-close">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                
                <div class="load-modal-body">
                    <!-- Classic Presets Section -->
                    <div class="load-section">
                        <div class="load-section-header">
                            <i data-lucide="sparkles"></i>
                            <span>Classic Evaluation Presets</span>
                        </div>
                        <div class="load-section-description">
                            Start with a famous evaluation function from the pioneers of computer chess
                        </div>
                        <div class="presets-grid" id="load-presets-grid"></div>
                    </div>
                    
                    <!-- Saved Evaluators Section -->
                    <div class="load-section">
                        <div class="load-section-header">
                            <i data-lucide="save"></i>
                            <span>Your Saved Evaluators</span>
                        </div>
                        <div class="saved-evals-list" id="saved-evals-list">
                            ${savedNames.length === 0 
                                ? '<div class="no-saved-evals">No saved evaluators yet. Create one and click Save!</div>'
                                : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Populate presets grid
        const presetsGrid = modal.querySelector("#load-presets-grid");
        Object.values(this.presets).forEach(preset => {
            const card = document.createElement("div");
            card.className = "preset-card";
            card.dataset.presetId = preset.id;
            
            card.innerHTML = `
                <div class="preset-card-icon">
                    <i data-lucide="${preset.icon}"></i>
                </div>
                <div class="preset-card-content">
                    <div class="preset-card-name">${preset.name}</div>
                    <div class="preset-card-author">${preset.author}</div>
                    <div class="preset-card-desc">${preset.description}</div>
                </div>
            `;
            
            card.addEventListener("click", () => {
                this.loadTemplate(preset.id);
                this.hideLoadModal();
            });
            
            presetsGrid.appendChild(card);
        });
        
        // Add "Start Empty" card
        const emptyCard = document.createElement("div");
        emptyCard.className = "preset-card preset-card-empty";
        emptyCard.innerHTML = `
            <div class="preset-card-icon">
                <i data-lucide="plus"></i>
            </div>
            <div class="preset-card-content">
                <div class="preset-card-name">Start Empty</div>
                <div class="preset-card-author">Build from scratch</div>
                <div class="preset-card-desc">Start with a blank slate and create your own evaluation</div>
            </div>
        `;
        emptyCard.addEventListener("click", () => {
            this.loadTemplate("empty");
            this.hideLoadModal();
        });
        presetsGrid.appendChild(emptyCard);
        
        // Populate saved evaluators
        const savedList = modal.querySelector("#saved-evals-list");
        savedNames.forEach(name => {
            const item = document.createElement("div");
            item.className = "saved-eval-item";
            
            const evalData = saved[name];
            const ruleCount = evalData.rules ? evalData.rules.length : 0;
            
            item.innerHTML = `
                <div class="saved-eval-info">
                    <div class="saved-eval-name">${name}</div>
                    <div class="saved-eval-meta">${ruleCount} rules</div>
                </div>
                <div class="saved-eval-actions">
                    <button class="saved-eval-load" title="Load">
                        <i data-lucide="upload"></i>
                    </button>
                    <button class="saved-eval-delete" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            
            // Load button
            item.querySelector(".saved-eval-load").addEventListener("click", (e) => {
                e.stopPropagation();
                this.evaluator = saved[name];
        document.getElementById("eval-name-input").value = this.evaluator.name;
                this.nextRuleId = Math.max(
                    ...this.evaluator.rules.map((r) => parseInt(r.id.replace("rule_", "")) || 0),
                    0
                ) + 1;
                this.renderRulesList();
                this.renderCategoryWeights();
                this.saveToStorage();
                this.hideLoadModal();
        this.showNotification(`Loaded "${name}"`, "success");
            });
            
            // Delete button
            item.querySelector(".saved-eval-delete").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${name}"?`)) {
                    delete saved[name];
                    localStorage.setItem("chess_saved_evals", JSON.stringify(saved));
                    item.remove();
                    if (Object.keys(saved).length === 0) {
                        savedList.innerHTML = '<div class="no-saved-evals">No saved evaluators yet. Create one and click Save!</div>';
                    }
                    this.showNotification(`Deleted "${name}"`, "info");
                }
            });
            
            // Click on item to load
            item.addEventListener("click", () => {
                this.evaluator = saved[name];
                document.getElementById("eval-name-input").value = this.evaluator.name;
                this.nextRuleId = Math.max(
                    ...this.evaluator.rules.map((r) => parseInt(r.id.replace("rule_", "")) || 0),
                    0
                ) + 1;
                this.renderRulesList();
                this.renderCategoryWeights();
                this.saveToStorage();
                this.hideLoadModal();
                this.showNotification(`Loaded "${name}"`, "success");
            });
            
            savedList.appendChild(item);
        });
        
        // Close handlers
        modal.querySelector("#load-modal-close").addEventListener("click", () => this.hideLoadModal());
        modal.querySelector(".eval-modal-backdrop").addEventListener("click", () => this.hideLoadModal());
        
        // Show modal
        modal.classList.add("active");
        
        // Init icons
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }
    
    hideLoadModal() {
        const modal = document.getElementById("load-preset-modal");
        if (modal) {
            modal.classList.remove("active");
        }
    }
    
    exportJson() {
        const json = JSON.stringify(this.evaluator, null, 2);
    const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
    const a = document.createElement("a");
        a.href = url;
    a.download = `${this.evaluator.name.replace(/\s+/g, "_")}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    this.showNotification("Exported to JSON", "success");
    }
    
    loadTemplate(templateName) {
        // Check classic presets first
        if (this.presets && this.presets[templateName]) {
            this.evaluator = JSON.parse(JSON.stringify(this.presets[templateName].evaluator));
        } else {
            // Legacy templates
        switch (templateName) {
      case "simple":
                this.evaluator = this.createSimpleTemplate();
                break;
      case "aggressive":
                this.evaluator = this.createAggressiveTemplate();
                break;
                case "empty":
                    this.evaluator = this.createEmptyEvaluator();
                    break;
            default:
                return;
            }
        }
        
    document.getElementById("eval-name-input").value = this.evaluator.name;
        this.nextRuleId = Math.max(
            ...this.evaluator.rules.map((r) => parseInt(r.id.replace("rule_", "")) || 0),
            0
        ) + 1;
        this.renderRulesList();
        this.renderCategoryWeights();
        this.saveToStorage();
        
        const presetInfo = this.presets && this.presets[templateName];
        const displayName = presetInfo ? presetInfo.name : templateName;
        this.showNotification(`Loaded "${displayName}"`, "success");
    }
    
    createSimpleTemplate() {
        return {
      name: "Simple Material",
      description: "Basic material counting",
            rules: [
        {
          id: "rule_1",
          name: "Pawns",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "pawn" },
          value: { type: "formula", formula: "n * 100" },
        },
        {
          id: "rule_2",
          name: "Knights",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "knight" },
          value: { type: "formula", formula: "n * 320" },
        },
        {
          id: "rule_3",
          name: "Bishops",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "bishop" },
          value: { type: "formula", formula: "n * 330" },
        },
        {
          id: "rule_4",
          name: "Rooks",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "rook" },
          value: { type: "formula", formula: "n * 500" },
        },
        {
          id: "rule_5",
          name: "Queens",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "queen" },
          value: { type: "formula", formula: "n * 900" },
        },
      ],
      categoryWeights: {
        material: 1.0,
        mobility: 0,
        king_safety: 0,
        pawn_structure: 0,
        positional: 0,
        piece_coordination: 0,
        threats: 0,
      },
        };
    }
    
    createTuringTemplate() {
        // Exact match of TuringEval.java
        return {
      name: "Turing (Exact)",
      description:
        "Exact implementation of Alan Turing's historical evaluation function",
            rules: [
                // === MATERIAL (lines 53-57 in TuringEval.java) ===
                // Using formula n * value where n = piece count (1 per piece)
        {
          id: "rule_1",
          name: "Pawns",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "pawn" },
          value: { type: "formula", formula: "n * 100" },
        },
        {
          id: "rule_2",
          name: "Knights",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "knight" },
          value: { type: "formula", formula: "n * 300" },
        },
        {
          id: "rule_3",
          name: "Bishops",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "bishop" },
          value: { type: "formula", formula: "n * 350" },
        },
        {
          id: "rule_4",
          name: "Rooks",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "rook" },
          value: { type: "formula", formula: "n * 500" },
        },
        {
          id: "rule_5",
          name: "Queens",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "queen" },
          value: { type: "formula", formula: "n * 1000" },
        },
                
                // === MOBILITY (lines 59-89, 106-127) - sqrt(moves + captures*2) * 10 ===
        {
          id: "rule_6",
          name: "Knight Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: {
            type: "mobility",
            pieceType: "knight",
            captureWeight: 2,
          },
          value: { type: "formula", formula: "10 * sqrt(n)" },
        },
        {
          id: "rule_7",
          name: "Bishop Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: {
            type: "mobility",
            pieceType: "bishop",
            captureWeight: 2,
          },
          value: { type: "formula", formula: "10 * sqrt(n)" },
        },
        {
          id: "rule_8",
          name: "Rook Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: { type: "mobility", pieceType: "rook", captureWeight: 2 },
          value: { type: "formula", formula: "10 * sqrt(n)" },
        },
        {
          id: "rule_9",
          name: "Queen Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: {
            type: "mobility",
            pieceType: "queen",
            captureWeight: 2,
          },
          value: { type: "formula", formula: "10 * sqrt(n)" },
        },
                
                // === KING MOBILITY (lines 92-94) - sqrt(kingMoves) * 10 ===
        {
          id: "rule_10",
          name: "King Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: { type: "mobility", pieceType: "king", captureWeight: 1 },
          value: { type: "formula", formula: "10 * sqrt(n)" },
        },
                
                // === DEFENSE BONUS (lines 65, 73, 81, 129-134) - +15 for 2+, +10 for 1 ===
        {
          id: "rule_11",
          name: "Knight Defense (2+)",
          enabled: true,
          category: "piece_coordination",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "knight",
            defenderType: "any",
            minDefenders: 2,
          },
          value: { type: "fixed", value: 15 },
        },
        {
          id: "rule_12",
          name: "Knight Defense (1)",
          enabled: true,
          category: "piece_coordination",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "knight",
            defenderType: "any",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 10 },
        },
        {
          id: "rule_13",
          name: "Bishop Defense (2+)",
          enabled: true,
          category: "piece_coordination",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "bishop",
            defenderType: "any",
            minDefenders: 2,
          },
          value: { type: "fixed", value: 15 },
        },
        {
          id: "rule_14",
          name: "Bishop Defense (1)",
          enabled: true,
          category: "piece_coordination",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "bishop",
            defenderType: "any",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 10 },
        },
        {
          id: "rule_15",
          name: "Rook Defense (2+)",
          enabled: true,
          category: "piece_coordination",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "rook",
            defenderType: "any",
            minDefenders: 2,
          },
          value: { type: "fixed", value: 15 },
        },
        {
          id: "rule_16",
          name: "Rook Defense (1)",
          enabled: true,
          category: "piece_coordination",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "rook",
            defenderType: "any",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 10 },
        },
                
                // === KING SAFETY (lines 160-163) - -1 per attack square ===
        {
          id: "rule_17",
          name: "King Safety",
          enabled: true,
          category: "king_safety",
          condition: { type: "always" },
          target: { type: "king_safety" },
          value: { type: "formula", formula: "-1 * n" },
        },
                
                // === PAWN ADVANCEMENT (lines 166-187) - +20 per rank, +30 if defended by non-pawn ===
        {
          id: "rule_18",
          name: "Pawn Advancement",
          enabled: true,
          category: "pawn_structure",
          condition: { type: "always" },
          target: { type: "pawn_advancement" },
          value: { type: "formula", formula: "20 * n" },
        },
        {
          id: "rule_19",
          name: "Pawns Defended by Knights",
          enabled: true,
          category: "pawn_structure",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "pawn",
            defenderType: "knight",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 30 },
        },
        {
          id: "rule_19b",
          name: "Pawns Defended by Bishops",
          enabled: true,
          category: "pawn_structure",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "pawn",
            defenderType: "bishop",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 30 },
        },
        {
          id: "rule_19c",
          name: "Pawns Defended by Rooks",
          enabled: true,
          category: "pawn_structure",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "pawn",
            defenderType: "rook",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 30 },
        },
        {
          id: "rule_19d",
          name: "Pawns Defended by Queens",
          enabled: true,
          category: "pawn_structure",
          condition: { type: "always" },
          target: {
            type: "defense",
            pieceType: "pawn",
            defenderType: "queen",
            minDefenders: 1,
          },
          value: { type: "fixed", value: 30 },
        },
                
                // === CASTLING (lines 189-212) - +100 if castled OR can castle ===
        {
          id: "rule_20",
          name: "Castled Bonus",
          enabled: true,
          category: "king_safety",
          condition: {
            type: "castling",
            player: "my",
            status: "has_castled_either",
          },
          target: { type: "global" },
          value: { type: "fixed", value: 100 },
        },
        {
          id: "rule_21",
          name: "Can Castle Bonus",
          enabled: true,
          category: "king_safety",
          condition: {
            type: "castling",
            player: "my",
            status: "can_still_castle",
          },
          target: { type: "global" },
          value: { type: "fixed", value: 100 },
        },
                
                // === CHECK BONUS (lines 40-43) - +50 for giving check ===
        {
          id: "rule_22",
          name: "Check Bonus",
          enabled: true,
          category: "threats",
          condition: { type: "always" },
          target: { type: "check" },
          value: { type: "fixed", value: 50 },
        },
      ],
      categoryWeights: {
        material: 1.0,
        mobility: 1.0,
        king_safety: 1.0,
        pawn_structure: 1.0,
        positional: 1.0,
        piece_coordination: 1.0,
        threats: 1.0,
      },
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CLASSIC EVALUATION PRESETS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Shannon's Evaluation (1950)
     * From "Programming a Computer for Playing Chess"
     * 
     * Formula: f(P) = 200*(K-K') + 9*(Q-Q') + 5*(R-R') + 3*(B-B'+N-N') + 1*(P-P')
     *               - 0.5*(D-D' + S-S' + I-I') + 0.1*(M-M')
     * 
     * D = doubled pawns, S = backward pawns, I = isolated pawns, M = mobility
     */
    createShannonPreset() {
        return {
            name: "Shannon (1950)",
            description: "Claude Shannon's foundational evaluation from 'Programming a Computer for Playing Chess'",
            rules: [
                // === MATERIAL (standard values) ===
                {
                    id: "rule_1",
                    name: "Pawns",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "pawn" },
                    value: { type: "fixed", value: 100 },
                },
                {
                    id: "rule_2",
                    name: "Knights",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "knight" },
                    value: { type: "fixed", value: 300 },
                },
                {
                    id: "rule_3",
                    name: "Bishops",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "bishop" },
                    value: { type: "fixed", value: 300 },
                },
                {
                    id: "rule_4",
                    name: "Rooks",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "rook" },
                    value: { type: "fixed", value: 500 },
                },
                {
                    id: "rule_5",
                    name: "Queens",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "queen" },
                    value: { type: "fixed", value: 900 },
                },
                
                // === PAWN STRUCTURE PENALTIES (-0.5 each) ===
                {
                    id: "rule_6",
                    name: "Doubled Pawns Penalty",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "doubled" },
                    value: { type: "formula", formula: "-50 * n" },
                },
                {
                    id: "rule_7",
                    name: "Isolated Pawns Penalty",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "isolated" },
                    value: { type: "formula", formula: "-50 * n" },
                },
                {
                    id: "rule_8",
                    name: "Backward Pawns Penalty",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "backward" },
                    value: { type: "formula", formula: "-50 * n" },
                },
                
                // === MOBILITY (+0.1 per legal move) ===
                {
                    id: "rule_9",
                    name: "Knight Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "knight", captureWeight: 1 },
                    value: { type: "formula", formula: "10 * n" },
                },
                {
                    id: "rule_10",
                    name: "Bishop Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "bishop", captureWeight: 1 },
                    value: { type: "formula", formula: "10 * n" },
                },
                {
                    id: "rule_11",
                    name: "Rook Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "rook", captureWeight: 1 },
                    value: { type: "formula", formula: "10 * n" },
                },
                {
                    id: "rule_12",
                    name: "Queen Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "queen", captureWeight: 1 },
                    value: { type: "formula", formula: "10 * n" },
                },
            ],
            categoryWeights: {
                material: 1.0,
                mobility: 1.0,
                king_safety: 1.0,
                pawn_structure: 1.0,
                positional: 1.0,
                piece_coordination: 1.0,
                threats: 1.0,
            },
        };
    }
    
    /**
     * SOMA Evaluation (1960s)
     * Early practical evaluation emphasizing center control
     */
    createSOMAPreset() {
        return {
            name: "SOMA (1960s)",
            description: "Early practical evaluation emphasizing center control and material balance",
            rules: [
                // === MATERIAL ===
                {
                    id: "rule_1",
                    name: "Pawns",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "pawn" },
                    value: { type: "fixed", value: 100 },
                },
                {
                    id: "rule_2",
                    name: "Knights",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "knight" },
                    value: { type: "fixed", value: 300 },
                },
                {
                    id: "rule_3",
                    name: "Bishops",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "bishop" },
                    value: { type: "fixed", value: 300 },
                },
                {
                    id: "rule_4",
                    name: "Rooks",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "rook" },
                    value: { type: "fixed", value: 500 },
                },
                {
                    id: "rule_5",
                    name: "Queens",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "queen" },
                    value: { type: "fixed", value: 900 },
                },
                
                // === CENTER CONTROL (core d4,e4,d5,e5) ===
                {
                    id: "rule_6",
                    name: "Center Control",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "center_control", centerType: "core" },
                    value: { type: "formula", formula: "25 * n" },
                },
                
                // === CENTER OCCUPATION ===
                {
                    id: "rule_7",
                    name: "Pieces in Center",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { 
                        type: "piece_placement",
                        pieceType: "any",
                        squares: ["d4", "e4", "d5", "e5"]
                    },
                    value: { type: "fixed", value: 30 },
                },
                
                // === PAWN STRUCTURE ===
                {
                    id: "rule_8",
                    name: "Doubled Pawns Penalty",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "doubled" },
                    value: { type: "formula", formula: "-30 * n" },
                },
                {
                    id: "rule_9",
                    name: "Isolated Pawns Penalty",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "isolated" },
                    value: { type: "formula", formula: "-25 * n" },
                },
                
                // === KING SAFETY (basic) ===
                {
                    id: "rule_10",
                    name: "King Safety",
                    enabled: true,
                    category: "king_safety",
                    condition: { type: "always" },
                    target: { type: "king_safety" },
                    value: { type: "formula", formula: "-5 * n" },
                },
            ],
            categoryWeights: {
                material: 1.0,
                mobility: 1.0,
                king_safety: 1.0,
                pawn_structure: 1.0,
                positional: 1.0,
                piece_coordination: 1.0,
                threats: 1.0,
            },
        };
    }
    
    /**
     * Simplified Evaluation Function (Tomasz Michniewski / Larry Kaufman style)
     * Modern hand-crafted baseline with piece-square tables
     */
    createSimplifiedPreset() {
        return {
            name: "Simplified (1990s)",
            description: "Modern hand-crafted baseline with piece-square tables and bishop pair bonus",
            rules: [
                // === MATERIAL ===
                {
                    id: "rule_1",
                    name: "Pawns",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "pawn" },
                    value: { type: "fixed", value: 100 },
                },
                {
                    id: "rule_2",
                    name: "Knights",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "knight" },
                    value: { type: "fixed", value: 320 },
                },
                {
                    id: "rule_3",
                    name: "Bishops",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "bishop" },
                    value: { type: "fixed", value: 330 },
                },
                {
                    id: "rule_4",
                    name: "Rooks",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "rook" },
                    value: { type: "fixed", value: 500 },
                },
                {
                    id: "rule_5",
                    name: "Queens",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "queen" },
                    value: { type: "fixed", value: 900 },
                },
                
                // === BISHOP PAIR BONUS ===
                {
                    id: "rule_6",
                    name: "Bishop Pair Bonus",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "bishop_pair" },
                    value: { type: "fixed", value: 50 },
                },
                
                // === PIECE-SQUARE TABLES (Simplified) ===
                {
                    id: "rule_7",
                    name: "Pawn Position",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "piece_square_table", pieceType: "pawn", preset: "simplified" },
                    value: { type: "formula", formula: "n" },
                },
                {
                    id: "rule_8",
                    name: "Knight Position",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "piece_square_table", pieceType: "knight", preset: "simplified" },
                    value: { type: "formula", formula: "n" },
                },
                {
                    id: "rule_9",
                    name: "Bishop Position",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "piece_square_table", pieceType: "bishop", preset: "simplified" },
                    value: { type: "formula", formula: "n" },
                },
                {
                    id: "rule_10",
                    name: "Rook Position",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "piece_square_table", pieceType: "rook", preset: "simplified" },
                    value: { type: "formula", formula: "n" },
                },
                {
                    id: "rule_11",
                    name: "Queen Position",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "piece_square_table", pieceType: "queen", preset: "simplified" },
                    value: { type: "formula", formula: "n" },
                },
                {
                    id: "rule_12",
                    name: "King Position (Middlegame)",
                    enabled: true,
                    category: "king_safety",
                    condition: { type: "game_phase", phase: "middlegame" },
                    target: { type: "piece_square_table", pieceType: "king", preset: "simplified" },
                    value: { type: "formula", formula: "n" },
                },
                {
                    id: "rule_13",
                    name: "King Position (Endgame)",
                    enabled: true,
                    category: "king_safety",
                    condition: { type: "game_phase", phase: "endgame" },
                    target: { type: "piece_square_table", pieceType: "king", preset: "pesto_eg" },
                    value: { type: "formula", formula: "n" },
                },
            ],
            categoryWeights: {
                material: 1.0,
                mobility: 1.0,
                king_safety: 1.0,
                pawn_structure: 1.0,
                positional: 1.0,
                piece_coordination: 1.0,
                threats: 1.0,
            },
        };
    }
    
    /**
     * Fruit-Style Evaluation (2005)
     * Revolutionary evaluation with king safety, passed pawns, mobility, and space
     */
    createFruitPreset() {
        return {
            name: "Fruit-Style (2005)",
            description: "Revolutionary evaluation with king safety, passed pawn bonuses, mobility, and space advantage",
            rules: [
                // === MATERIAL ===
                {
                    id: "rule_1",
                    name: "Pawns",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "pawn" },
                    value: { type: "fixed", value: 100 },
                },
                {
                    id: "rule_2",
                    name: "Knights",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "knight" },
                    value: { type: "fixed", value: 325 },
                },
                {
                    id: "rule_3",
                    name: "Bishops",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "bishop" },
                    value: { type: "fixed", value: 335 },
                },
                {
                    id: "rule_4",
                    name: "Rooks",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "rook" },
                    value: { type: "fixed", value: 500 },
                },
                {
                    id: "rule_5",
                    name: "Queens",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "simple_material", pieceType: "queen" },
                    value: { type: "fixed", value: 975 },
                },
                
                // === MOBILITY (weighted by piece type) ===
                {
                    id: "rule_6",
                    name: "Knight Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "knight", captureWeight: 1 },
                    value: { type: "formula", formula: "4 * n" },
                },
                {
                    id: "rule_7",
                    name: "Bishop Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "bishop", captureWeight: 1 },
                    value: { type: "formula", formula: "5 * n" },
                },
                {
                    id: "rule_8",
                    name: "Rook Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "rook", captureWeight: 1 },
                    value: { type: "formula", formula: "2 * n" },
                },
                {
                    id: "rule_9",
                    name: "Queen Mobility",
                    enabled: true,
                    category: "mobility",
                    condition: { type: "always" },
                    target: { type: "mobility", pieceType: "queen", captureWeight: 1 },
                    value: { type: "formula", formula: "1 * n" },
                },
                
                // === PAWN STRUCTURE ===
                {
                    id: "rule_10",
                    name: "Doubled Pawns",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "doubled" },
                    value: { type: "formula", formula: "-20 * n" },
                },
                {
                    id: "rule_11",
                    name: "Isolated Pawns",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "isolated" },
                    value: { type: "formula", formula: "-20 * n" },
                },
                {
                    id: "rule_12",
                    name: "Backward Pawns",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "pawn_structure", structureType: "backward" },
                    value: { type: "formula", formula: "-10 * n" },
                },
                
                // === PASSED PAWNS (exponential bonus by rank) ===
                {
                    id: "rule_13",
                    name: "Passed Pawn Bonus",
                    enabled: true,
                    category: "pawn_structure",
                    condition: { type: "always" },
                    target: { type: "passed_pawn", measureType: "squared_rank" },
                    value: { type: "formula", formula: "10 * n" },
                },
                
                // === KING SAFETY ===
                {
                    id: "rule_14",
                    name: "King Safety",
                    enabled: true,
                    category: "king_safety",
                    condition: { type: "always" },
                    target: { type: "king_safety" },
                    value: { type: "formula", formula: "-10 * n" },
                },
                
                // === SPACE ADVANTAGE ===
                {
                    id: "rule_15",
                    name: "Space Advantage",
                    enabled: true,
                    category: "positional",
                    condition: { type: "always" },
                    target: { type: "space" },
                    value: { type: "formula", formula: "3 * n" },
                },
                
                // === BISHOP PAIR ===
                {
                    id: "rule_16",
                    name: "Bishop Pair",
                    enabled: true,
                    category: "material",
                    condition: { type: "always" },
                    target: { type: "bishop_pair" },
                    value: { type: "fixed", value: 45 },
                },
            ],
            categoryWeights: {
                material: 1.0,
                mobility: 1.0,
                king_safety: 1.0,
                pawn_structure: 1.0,
                positional: 1.0,
                piece_coordination: 1.0,
                threats: 1.0,
            },
        };
    }
    
    createAggressiveTemplate() {
        return {
      name: "Aggressive",
      description: "Prioritizes attacks and mobility",
            rules: [
        {
          id: "rule_1",
          name: "Pawns",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "pawn" },
          value: { type: "fixed", value: 80 },
        },
        {
          id: "rule_2",
          name: "Knights",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "knight" },
          value: { type: "fixed", value: 350 },
        },
        {
          id: "rule_3",
          name: "Bishops",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "bishop" },
          value: { type: "fixed", value: 350 },
        },
        {
          id: "rule_4",
          name: "Rooks",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "rook" },
          value: { type: "fixed", value: 450 },
        },
        {
          id: "rule_5",
          name: "Queens",
          enabled: true,
          category: "material",
          condition: { type: "always" },
          target: { type: "simple_material", pieceType: "queen" },
          value: { type: "fixed", value: 950 },
        },
        {
          id: "rule_6",
          name: "Knight Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: {
            type: "mobility",
            pieceType: "knight",
            captureWeight: 2.5,
          },
          value: { type: "formula", formula: "15 * n" },
        },
        {
          id: "rule_7",
          name: "Bishop Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: {
            type: "mobility",
            pieceType: "bishop",
            captureWeight: 2.5,
          },
          value: { type: "formula", formula: "15 * n" },
        },
        {
          id: "rule_8",
          name: "Rook Mobility",
          enabled: true,
          category: "mobility",
          condition: { type: "always" },
          target: { type: "mobility", pieceType: "rook", captureWeight: 2.5 },
          value: { type: "formula", formula: "12 * n" },
        },
        {
          id: "rule_9",
          name: "Check Bonus",
          enabled: true,
          category: "threats",
          condition: { type: "always" },
          target: { type: "check" },
          value: { type: "fixed", value: 100 },
        },
        {
          id: "rule_10",
          name: "King Distance (Endgame)",
          enabled: true,
          category: "positional",
          condition: { type: "game_phase", phase: "endgame" },
          target: {
            type: "piece_distance",
            piece1Type: "king",
            piece1Color: "my",
            piece2Type: "king",
            piece2Color: "opponent",
            distanceType: "chebyshev",
          },
          value: { type: "formula", formula: "-10 * n" },
        },
      ],
      categoryWeights: {
        material: 0.8,
        mobility: 1.5,
        king_safety: 0.7,
        pawn_structure: 0.5,
        positional: 1.0,
        piece_coordination: 1.0,
        threats: 1.5,
      },
    };
  }

  showNotification(message, type = "info") {
    const existing = document.querySelector(".eval-notification");
        if (existing) existing.remove();
        
    const notification = document.createElement("div");
        notification.className = `eval-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
    setTimeout(() => notification.classList.add("show"), 10);
        setTimeout(() => {
      notification.classList.remove("show");
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
      this.showNotification("Add some rules before publishing!", "error");
            return;
        }
        
        // Show confirmation modal instead of prompts
    this.showConfirmModal("publish");
    }
    
    // Perform the actual publish after modal confirmation
    async doPublishToLeaderboard(author) {
        const name = this.evaluator.name;
        
        try {
      const response = await fetch("http://localhost:3001/api/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
          author: author || "Anonymous",
          description: this.evaluator.description || "",
                    eval_config: this.evaluator,
          is_public: true,
        }),
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
        this.showNotification(
          "Published! ELO calculation will begin shortly.",
          "success",
        );
                
                // Switch to leaderboard tab
                setTimeout(() => {
                    document.querySelector('[data-tab="leaderboard-tab"]')?.click();
                }, 1500);
            } else {
        throw new Error(data.error || "Upload failed");
            }
        } catch (error) {
      console.error("Publish failed:", error);
      this.showNotification(
        `Failed to publish: ${error.message}. Is the server running?`,
        "error",
      );
        }
    }
    
    // Show confirmation modal for save/publish
    showConfirmModal(action) {
    const modal = document.getElementById("eval-confirm-modal");
    const title = document.getElementById("confirm-title");
    const evalName = document.getElementById("confirm-eval-name");
    const ruleCount = document.getElementById("confirm-rule-count");
    const activeCount = document.getElementById("confirm-active-count");
    const rulesList = document.getElementById("confirm-rules-list");
    const authorSection = document.getElementById("confirm-author-section");
    const authorInput = document.getElementById("confirm-author-input");
    const okBtn = document.getElementById("confirm-ok-btn");
    const okText = document.getElementById("confirm-ok-text");
    const cancelBtn = document.getElementById("confirm-cancel-btn");
    const closeBtn = document.getElementById("eval-confirm-close");
        
        // Set title and action-specific UI
    if (action === "publish") {
      title.textContent = "Publish to Leaderboard";
      okText.textContent = "Publish";
      authorSection.style.display = "block";
      authorInput.value = "";
        } else {
      title.textContent = "Save Evaluator";
      okText.textContent = "Save";
      authorSection.style.display = "none";
        }
        
        // Populate eval info
        evalName.textContent = this.evaluator.name;
        const total = this.evaluator.rules.length;
    const active = this.evaluator.rules.filter((r) => r.enabled).length;
        ruleCount.textContent = total;
        activeCount.textContent = active;
        
        // Generate rules summary
        rulesList.innerHTML = this.generateRulesSummary();
        
        // Bind action handlers
        const handleOk = () => {
            this.hideConfirmModal();
      if (action === "publish") {
                this.doPublishToLeaderboard(authorInput.value);
            } else {
                this.doSaveEvaluator();
            }
        };
        
        const handleCancel = () => {
            this.hideConfirmModal();
        };
        
        // Remove old handlers and add new ones
        okBtn.onclick = handleOk;
        cancelBtn.onclick = handleCancel;
        closeBtn.onclick = handleCancel;
        
        // Show modal
    modal.classList.add("active");
        
        // Reinitialize Lucide icons
    if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }
    
    // Hide confirmation modal
    hideConfirmModal() {
    const modal = document.getElementById("eval-confirm-modal");
    modal.classList.remove("active");
    }
    
    // Generate a summary of rules for the confirmation modal
    generateRulesSummary() {
        const rules = this.evaluator.rules;
        if (rules.length === 0) {
            return '<div class="no-rules">No rules defined</div>';
        }
        
        // Group rules by category
        const byCategory = {};
        for (const rule of rules) {
      const cat = rule.category || "uncategorized";
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(rule);
        }
        
    let html = "";
        for (const [category, catRules] of Object.entries(byCategory)) {
            html += `<div class="summary-category">`;
            html += `<div class="category-name">${this.formatOption(category)}</div>`;
            html += `<div class="category-rules">`;
            for (const rule of catRules) {
        const enabledClass = rule.enabled ? "enabled" : "disabled";
                const value = this.describeValue(rule.value || {});
                html += `<div class="summary-rule ${enabledClass}">`;
                html += `<span class="rule-name">${rule.name}</span>`;
                html += `<span class="rule-value">${value}</span>`;
                html += `</div>`;
            }
            html += `</div></div>`;
        }
        
        return html;
    }
}

// Export for use in tabs
// Note: Initialization happens in index.html when the Eval Builder tab is opened
window.EvalBuilder = EvalBuilder;
