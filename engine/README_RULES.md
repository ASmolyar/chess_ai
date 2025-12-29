# Rule-Based Evaluation System

## Overview

The chess engine now supports a **composable rule-based evaluation system** that allows users to build custom evaluation functions from modular building blocks.

Instead of hardcoding evaluation logic, you can now:
- ✅ Define evaluation as a set of independent **rules**
- ✅ Each rule has: **condition** (when) + **target** (what) + **value** (how much)
- ✅ Build complex features from simple primitives
- ✅ Enable/disable rules dynamically
- ✅ Adjust category weights to tune strategy
- ✅ Create evaluators programmatically or from JSON

## Architecture

### Core Concepts

```
Rule = Condition + Target + Value
```

- **Condition**: When does this rule apply? (optional, defaults to "always")
- **Target**: What pieces/squares are we evaluating?
- **Value**: How much score does each target contribute?

### Example

**"For every pawn advanced past the 5th rank in the endgame, add 30 centipawns"**

```
Condition: GamePhase == ENDGAME
Target:    Pawns on ranks 6-8
Value:     +30 per pawn
```

## File Structure

```
engine/src/chess/
├── RuleBasedEvaluator.java          # Main evaluator class
├── rules/
│   ├── EvalContext.java             # Evaluation context
│   ├── Condition.java               # Condition interface
│   ├── Target.java                  # Target interface
│   ├── ValueCalculator.java         # Value interface
│   ├── Rule.java                    # Single rule
│   ├── SimpleRuleBuilder.java       # Helper for creating rules
│   ├── TuringEvalBuilder.java       # Example: Turing eval as rules
│   ├── conditions/
│   │   ├── AlwaysCondition.java
│   │   ├── GamePhaseCondition.java
│   │   ├── MaterialCondition.java
│   │   ├── CastlingCondition.java
│   │   ├── PieceDistanceCondition.java
│   │   └── LogicalCondition.java
│   ├── targets/
│   │   ├── SimpleMaterialTarget.java
│   │   ├── MobilityTarget.java
│   │   ├── DefenseTarget.java
│   │   ├── PieceDistanceTarget.java
│   │   ├── PawnAdvancementTarget.java
│   │   ├── CheckTarget.java
│   │   └── GlobalTarget.java
│   └── values/
│       ├── FixedValueCalculator.java
│       ├── ScaledValueCalculator.java
│       └── ConditionalValueCalculator.java
```

## Available Building Blocks

### Conditions (When?)

| Condition | Description | Example |
|-----------|-------------|---------|
| `AlwaysCondition` | Always true | Apply to all positions |
| `GamePhaseCondition` | Opening/Middlegame/Endgame | Only in endgame |
| `MaterialCondition` | Piece count | If I have 2+ bishops |
| `CastlingCondition` | Castling status | If I've castled |
| `PieceDistanceCondition` | Distance between pieces | If king >3 squares from pawn |
| `LogicalCondition` | AND/OR/NOT | Endgame AND no queens |

### Targets (What?)

| Target | Description | Example |
|--------|-------------|---------|
| `SimpleMaterialTarget` | Count pieces | All my pawns |
| `MobilityTarget` | Piece mobility | Knight legal moves |
| `DefenseTarget` | Defended pieces | Knights defended by 2+ pieces |
| `PieceDistanceTarget` | Distance measurement | King-to-pawn distance |
| `PawnAdvancementTarget` | Pawn rank | Each pawn's advancement |
| `CheckTarget` | Giving check | Am I giving check? |
| `GlobalTarget` | Single evaluation | Once per position |

### Values (How Much?)

| Value Calculator | Description | Example |
|-----------------|-------------|---------|
| `FixedValueCalculator` | Fixed amount | +100 centipawns |
| `ScaledValueCalculator` | Scales by measurement | +10 * sqrt(mobility) |
| `ConditionalValueCalculator` | Different values by range | If distance <2: 0, else -10 |

Scale types: LINEAR, SQUARE_ROOT, QUADRATIC, EXPONENTIAL

## Usage Examples

See `EXAMPLES.md` for detailed examples.

### Quick Start

```java
// 1. Create evaluator
RuleBasedEvaluator.Builder builder = new RuleBasedEvaluator.Builder();
builder.name("My Eval");

// 2. Add rules
builder.addRule(SimpleRuleBuilder.material("pawns", PAWN, 100));
builder.addRule(SimpleRuleBuilder.mobility("knights", KNIGHT, 10, 1.0));

// 3. Build
RuleBasedEvaluator eval = builder.build();

// 4. Use in engine
Engine engine = new Engine(eval);
```

### Distance-Based Rule

```java
// "If king is >3 squares from opponent pawn in endgame, penalty scales by distance"
Rule rule = new Rule(
    "king_pawn_endgame",
    "King-Pawn Distance",
    "endgame",
    new GamePhaseCondition(GamePhaseCondition.Phase.ENDGAME),
    new PieceDistanceTarget(KING, 0, PAWN, 1, MANHATTAN),
    new ScaledValueCalculator(-10, 1.0, LINEAR),
    1.0
);
```

## Benefits

✅ **Composable**: Build complex evaluators from simple rules  
✅ **Readable**: Rules are self-documenting  
✅ **Debuggable**: See which rules contribute to score  
✅ **Extensible**: Add new conditions/targets/values easily  
✅ **Tunable**: Adjust weights without recompiling  
✅ **Shareable**: Export/import as JSON (future)  

## Future Work

- [ ] JSON parser for rule definitions
- [ ] Web UI for visual rule builder
- [ ] Rule visualization/debugging tools
- [ ] Machine learning weight optimization
- [ ] Piece-square table support
- [ ] More advanced conditions (trapped pieces, weak squares, etc.)

## Integration with UI

The rule system is designed to integrate with a web UI where users can:

1. **Drag and drop** building blocks to create rules
2. **Preview** rules in human-readable format
3. **Test** rules against specific positions
4. **Share** custom evaluators with others
5. **Compare** different evaluators side-by-side

See the main project README for UI integration details.

