# Rule JSON Format Specification

This document describes a proposed JSON format for defining evaluation rules. This format can be used by the web UI to create and export custom evaluators.

## Evaluator Format

```json
{
  "name": "My Custom Evaluator",
  "description": "Material + mobility + king safety",
  "version": "1.0",
  
  "categoryWeights": {
    "material": 1.0,
    "mobility": 0.6,
    "king_safety": 1.2,
    "pawn_structure": 0.8,
    "positional": 0.7,
    "piece_coordination": 0.9,
    "threats": 1.0
  },
  
  "rules": [
    // Rule objects (see below)
  ]
}
```

## Rule Format

### Simple Material Rule

```json
{
  "id": "pawns",
  "name": "Pawn Material",
  "category": "material",
  "enabled": true,
  "weight": 1.0,
  
  "condition": null,
  
  "target": {
    "type": "simple_material",
    "pieceType": "pawn"
  },
  
  "value": {
    "type": "fixed",
    "value": 100
  }
}
```

### Mobility Rule (with capture weighting)

```json
{
  "id": "knight_mobility",
  "name": "Knight Mobility",
  "category": "mobility",
  "enabled": true,
  "weight": 1.0,
  
  "condition": null,
  
  "target": {
    "type": "mobility",
    "pieceType": "knight",
    "captureWeight": 2.0
  },
  
  "value": {
    "type": "scaled",
    "baseValue": 10,
    "multiplier": 1.0,
    "scaleType": "square_root"
  }
}
```

### Distance-Based Rule

```json
{
  "id": "king_pawn_endgame",
  "name": "King-Pawn Distance in Endgame",
  "category": "positional",
  "enabled": true,
  "weight": 1.0,
  
  "condition": {
    "type": "AND",
    "conditions": [
      {
        "type": "game_phase",
        "phase": "endgame"
      },
      {
        "type": "piece_distance",
        "piece1": { "type": "king", "color": "my" },
        "piece2": { "type": "pawn", "color": "opponent" },
        "comparison": "greater_than",
        "distance": 3
      }
    ]
  },
  
  "target": {
    "type": "piece_distance",
    "piece1": { "type": "king", "color": "my" },
    "piece2": { "type": "pawn", "color": "opponent" },
    "distanceType": "manhattan"
  },
  
  "value": {
    "type": "scaled",
    "baseValue": -10,
    "multiplier": 1.0,
    "scaleType": "linear"
  }
}
```

### Defense Rule

```json
{
  "id": "knight_defense",
  "name": "Defended Knights",
  "category": "piece_coordination",
  "enabled": true,
  "weight": 1.0,
  
  "condition": null,
  
  "target": {
    "type": "defense",
    "pieceType": "knight",
    "minDefenders": 1
  },
  
  "value": {
    "type": "fixed",
    "value": 15
  }
}
```

### Castling Rule

```json
{
  "id": "has_castled",
  "name": "Castled King Bonus",
  "category": "king_safety",
  "enabled": true,
  "weight": 1.0,
  
  "condition": {
    "type": "castling",
    "player": "my",
    "status": "has_castled_either"
  },
  
  "target": {
    "type": "global"
  },
  
  "value": {
    "type": "fixed",
    "value": 60
  }
}
```

### Complex Conditional Rule

```json
{
  "id": "bishop_pair_endgame",
  "name": "Bishop Pair in Endgame",
  "category": "material",
  "enabled": true,
  "weight": 1.0,
  
  "condition": {
    "type": "AND",
    "conditions": [
      {
        "type": "game_phase",
        "phase": "endgame"
      },
      {
        "type": "material",
        "pieceType": "bishop",
        "player": "my",
        "comparison": "at_least",
        "count": 2
      }
    ]
  },
  
  "target": {
    "type": "global"
  },
  
  "value": {
    "type": "conditional",
    "ranges": [
      { "min": 0, "max": 999, "value": 50 }
    ],
    "default": 0
  }
}
```

## Condition Types

### Always (null or omitted)

```json
"condition": null
```

### Game Phase

```json
{
  "type": "game_phase",
  "phase": "opening" | "early_middle" | "middlegame" | "endgame" | "late_endgame"
}
```

### Material

```json
{
  "type": "material",
  "pieceType": "pawn" | "knight" | "bishop" | "rook" | "queen",
  "player": "my" | "opponent" | "both",
  "comparison": "exactly" | "at_least" | "at_most" | "more_than" | "less_than",
  "count": number
}
```

### Castling

```json
{
  "type": "castling",
  "player": "my" | "opponent",
  "status": "has_castled_kingside" | "has_castled_queenside" | 
           "has_castled_either" | "has_not_castled" | 
           "can_still_castle" | "cannot_castle" | "lost_castling_rights"
}
```

### Piece Distance

```json
{
  "type": "piece_distance",
  "piece1": {
    "type": "king" | "queen" | "rook" | "bishop" | "knight" | "pawn",
    "color": "my" | "opponent"
  },
  "piece2": {
    "type": "...",
    "color": "..."
  },
  "comparison": "less_than" | "less_equal" | "greater_than" | "greater_equal" | "exactly",
  "distance": number
}
```

### Logical (AND/OR/NOT)

```json
{
  "type": "AND" | "OR" | "NOT",
  "conditions": [
    // Nested condition objects
  ]
}
```

## Target Types

### Simple Material

```json
{
  "type": "simple_material",
  "pieceType": "pawn" | "knight" | "bishop" | "rook" | "queen"
}
```

### Mobility

```json
{
  "type": "mobility",
  "pieceType": "knight" | "bishop" | "rook" | "queen" | "king",
  "captureWeight": number  // Default: 1.0, Turing: 2.0
}
```

### Defense

```json
{
  "type": "defense",
  "pieceType": "pawn" | "knight" | "bishop" | "rook" | "queen",
  "minDefenders": number
}
```

### Piece Distance

```json
{
  "type": "piece_distance",
  "piece1": {
    "type": "...",
    "color": "my" | "opponent"
  },
  "piece2": {
    "type": "...",
    "color": "..."
  },
  "distanceType": "manhattan" | "chebyshev"
}
```

### Pawn Advancement

```json
{
  "type": "pawn_advancement"
}
```

### Check

```json
{
  "type": "check"
}
```

### Global

```json
{
  "type": "global"
}
```

## Value Types

### Fixed

```json
{
  "type": "fixed",
  "value": number  // In centipawns
}
```

### Scaled

```json
{
  "type": "scaled",
  "baseValue": number,
  "multiplier": number,
  "scaleType": "linear" | "square_root" | "quadratic" | "exponential"
}
```

### Conditional

```json
{
  "type": "conditional",
  "ranges": [
    { "min": number, "max": number, "value": number }
  ],
  "default": number
}
```

## Complete Example: Simple Evaluator

```json
{
  "name": "Simple Evaluator",
  "description": "Just material and mobility",
  "version": "1.0",
  
  "categoryWeights": {
    "material": 1.0,
    "mobility": 0.5
  },
  
  "rules": [
    {
      "id": "pawns",
      "name": "Pawn Material",
      "category": "material",
      "enabled": true,
      "weight": 1.0,
      "condition": null,
      "target": { "type": "simple_material", "pieceType": "pawn" },
      "value": { "type": "fixed", "value": 100 }
    },
    {
      "id": "knights",
      "name": "Knight Material",
      "category": "material",
      "enabled": true,
      "weight": 1.0,
      "condition": null,
      "target": { "type": "simple_material", "pieceType": "knight" },
      "value": { "type": "fixed", "value": 320 }
    },
    {
      "id": "knight_mobility",
      "name": "Knight Mobility",
      "category": "mobility",
      "enabled": true,
      "weight": 1.0,
      "condition": null,
      "target": { "type": "mobility", "pieceType": "knight", "captureWeight": 1.0 },
      "value": { "type": "scaled", "baseValue": 10, "multiplier": 1.0, "scaleType": "square_root" }
    }
  ]
}
```

## Implementation Notes

When building the UI:

1. **Rule Builder**: Let users drag and drop these building blocks
2. **Preview**: Show human-readable version like "For every pawn: +100 centipawns"
3. **Validation**: Ensure required fields are present
4. **Export**: Generate JSON in this format
5. **Import**: Parse JSON and rebuild rules using RuleBasedEvaluator.Builder
6. **Server Communication**: Send JSON to backend to create evaluator

## Java Parser (Future Work)

You would create a parser like:

```java
public class RuleJsonParser {
    public RuleBasedEvaluator parse(String json) {
        // Parse JSON
        // Build rules using SimpleRuleBuilder or direct construction
        // Return RuleBasedEvaluator
    }
    
    public String export(RuleBasedEvaluator eval) {
        // Serialize evaluator to JSON
        // Return JSON string
    }
}
```

This would integrate with your web UI to load/save custom evaluators.



