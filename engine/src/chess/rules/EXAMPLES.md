# Rule-Based Evaluator Examples

This document shows how to create custom chess evaluators using the rule-based system.

## Quick Start

### 1. Using Pre-built Evaluators

```java
// Create Turing's evaluation as a rule-based evaluator
RuleBasedEvaluator turingEval = TuringEvalBuilder.build();

// Use it in the engine
Engine engine = new Engine(turingEval);
```

### 2. Building Custom Evaluators

```java
// Create a simple evaluator
RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();

builder.name("My Custom Eval")
       .description("Simple material + mobility evaluator");

// Add material rules
builder.addRule(SimpleRuleBuilder.material("pawns", PAWN, 110));
builder.addRule(SimpleRuleBuilder.material("knights", KNIGHT, 320));
builder.addRule(SimpleRuleBuilder.material("bishops", BISHOP, 330));
builder.addRule(SimpleRuleBuilder.material("rooks", ROOK, 500));
builder.addRule(SimpleRuleBuilder.material("queens", QUEEN, 900));

// Add mobility rules
builder.addRule(SimpleRuleBuilder.mobility("knight_mobility", KNIGHT, 10, 1.0));
builder.addRule(SimpleRuleBuilder.mobility("bishop_mobility", BISHOP, 10, 1.0));

// Build the evaluator
RuleBasedEvaluator eval = builder.build();
```

## Building Block Examples

### Material Rules

```java
// Simple: For every pawn, add 100 centipawns
Rule pawnRule = SimpleRuleBuilder.material("pawns", PAWN, 100);

// For every knight, add 320 centipawns
Rule knightRule = SimpleRuleBuilder.material("knights", KNIGHT, 320);
```

### Mobility Rules

```java
// Knight mobility: sqrt(moves) * 10, captures count same as regular moves
Rule knightMobility = SimpleRuleBuilder.mobility("knight_mob", KNIGHT, 10, 1.0);

// Rook mobility: sqrt(moves) * 10, captures count DOUBLE
Rule rookMobility = SimpleRuleBuilder.mobility("rook_mob", ROOK, 10, 2.0);
```

### Defense Rules

```java
// Knights defended by at least 1 piece: +10
Rule knightDefense1 = SimpleRuleBuilder.defense("knight_def_1", KNIGHT, 1, 10);

// Knights defended by at least 2 pieces: +5 more (total 15)
Rule knightDefense2 = SimpleRuleBuilder.defense("knight_def_2", KNIGHT, 2, 5);
```

### Distance Rules

```java
// If king is more than 3 squares from enemy passed pawn: -10
Rule kingPawnDist = SimpleRuleBuilder.distanceCondition(
    "king_pawn_dist",
    "King far from pawn",
    KING, 0,    // my king
    PAWN, 1,    // opponent pawn
    ">", 3,     // more than 3 squares
    -10         // penalty
);

// Penalty scales linearly with distance: -5 per square
Rule kingPawnScaled = SimpleRuleBuilder.distanceScaled(
    "king_pawn_scaled",
    "King pawn distance penalty",
    KING, 0,    // my king
    PAWN, 1,    // opponent pawn
    -5          // -5 centipawns per square of distance
);
```

### Pawn Advancement

```java
// 20 centipawns per rank advanced
Rule pawnAdv = SimpleRuleBuilder.pawnAdvancement("pawn_adv", 20);
```

### Castling

```java
// Has castled: +100
Rule castled = SimpleRuleBuilder.castlingBonus("has_castled", "has_castled", 100);

// Can still castle: +50
Rule canCastle = SimpleRuleBuilder.castlingBonus("can_castle", "can_castle", 50);
```

### Game Phase Rules

```java
// Bishop pair bonus only in endgame
Rule bishopPairEndgame = SimpleRuleBuilder.gamePhaseRule(
    "bishop_pair_endgame",
    "Bishop Pair in Endgame",
    "endgame",
    new SimpleMaterialTarget(BISHOP), // counts bishops
    new ConditionalValueCalculator(
        Arrays.asList(
            new ConditionalValueCalculator.Range(2, 999, 50) // if 2+ bishops: +50
        ),
        0
    ),
    "material"
);
```

## Advanced: Manual Rule Construction

```java
// Create a rule manually for full control
Rule advancedRule = new Rule(
    "custom_rule_id",
    "Custom Rule Name",
    "category",
    
    // CONDITION: When does this rule apply?
    new LogicalCondition(
        LogicalCondition.Operator.AND,
        Arrays.asList(
            new GamePhaseCondition(GamePhaseCondition.Phase.ENDGAME),
            new MaterialCondition(QUEEN, MaterialCondition.Player.BOTH, 
                                MaterialCondition.Comparison.EXACTLY, 0)
        )
    ),
    
    // TARGET: What are we evaluating?
    new PieceDistanceTarget(
        KING, 0,  // my king
        PAWN, 1,  // opponent pawns
        PieceDistanceTarget.DistanceType.MANHATTAN
    ),
    
    // VALUE: How much is it worth?
    new ScaledValueCalculator(
        -10,  // -10 centipawns
        1.0,  // multiplier
        ScaledValueCalculator.ScaleType.LINEAR  // per square of distance
    ),
    
    1.0  // rule weight
);
```

## Complete Example: Simple Evaluator

```java
public class SimpleEvalExample {
    public static RuleBasedEvaluator createSimpleEval() {
        RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
        
        builder.name("Simple Eval")
               .description("Material + Mobility + King Safety");
        
        // Material (standard values)
        builder.addRule(SimpleRuleBuilder.material("pawns", PAWN, 100));
        builder.addRule(SimpleRuleBuilder.material("knights", KNIGHT, 320));
        builder.addRule(SimpleRuleBuilder.material("bishops", BISHOP, 330));
        builder.addRule(SimpleRuleBuilder.material("rooks", ROOK, 500));
        builder.addRule(SimpleRuleBuilder.material("queens", QUEEN, 900));
        
        // Mobility (sqrt of move count * 10)
        builder.addRule(SimpleRuleBuilder.mobility("knight_mobility", KNIGHT, 10, 1.0));
        builder.addRule(SimpleRuleBuilder.mobility("bishop_mobility", BISHOP, 10, 1.0));
        builder.addRule(SimpleRuleBuilder.mobility("rook_mobility", ROOK, 10, 1.0));
        builder.addRule(SimpleRuleBuilder.mobility("queen_mobility", QUEEN, 10, 1.0));
        
        // Castling bonus
        builder.addRule(SimpleRuleBuilder.castlingBonus("castled", "has_castled", 50));
        
        // Category weights
        builder.setCategoryWeight("material", 1.0);
        builder.setCategoryWeight("mobility", 0.5);
        builder.setCategoryWeight("king_safety", 1.0);
        
        return builder.build();
    }
}
```

## Category Weights

Categories allow you to scale groups of rules together:

```java
builder.setCategoryWeight("material", 1.0);       // Full weight
builder.setCategoryWeight("mobility", 0.5);       // Half weight
builder.setCategoryWeight("king_safety", 1.2);    // 20% bonus
builder.setCategoryWeight("pawn_structure", 0.8); // Slightly reduced
```

Standard categories:
- `material` - piece values
- `mobility` - piece movement
- `king_safety` - king protection
- `pawn_structure` - pawn formations
- `positional` - strategic factors
- `piece_coordination` - piece relationships
- `threats` - checks, attacks

## Rule Management

```java
// Enable/disable rules dynamically
evaluator.setRuleEnabled("pawns", false);  // Disable pawn material

// Get a specific rule
Rule rule = evaluator.getRule("knight_mobility");

// Get all rules
List<Rule> rules = evaluator.getRules();

// Get category weights
Map<String, Double> weights = evaluator.getCategoryWeights();
```

## UI Integration

For a web UI, you can export rule configurations as JSON-like structures:

```java
// Pseudo-code for JSON export
{
  "name": "My Custom Eval",
  "description": "Description here",
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
      "target": { "type": "simple_material", "pieceType": "PAWN" },
      "value": { "type": "fixed", "value": 100 }
    }
  ]
}
```

