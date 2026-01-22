package chess.rules.values;

import chess.rules.ValueCalculator;
import chess.rules.EvalContext;

/**
 * Calculator that evaluates a custom mathematical formula.
 * Supports formulas like "10 * sqrt(n)", "n^2 / 10", "100 * log(n + 1)"
 * where 'n' is the measurement from the target.
 */
public class FormulaValueCalculator implements ValueCalculator {
    private final String formula;
    private final String jsFormula; // Pre-converted to Java-compatible form
    
    public FormulaValueCalculator(String formula) {
        this.formula = formula;
        this.jsFormula = convertFormula(formula);
    }
    
    @Override
    public int calculate(EvalContext ctx) {
        double n = ctx.measurement;
        double result = evaluate(n);
        return (int) result;
    }
    
    /**
     * Evaluate the formula with the given n value.
     * This is a simple expression evaluator - no external dependencies.
     */
    private double evaluate(double n) {
        try {
            return evaluateExpression(jsFormula, n);
        } catch (Exception e) {
            // If evaluation fails, return 0
            return 0.0;
        }
    }
    
    /**
     * Convert formula string to evaluable form.
     * Handles: sqrt, abs, log, ln, sin, cos, floor, ceil, round, ^, min, max, pow, exp
     */
    private static String convertFormula(String formula) {
        if (formula == null) return "n";
        return formula
            .replace("^", "**")  // For our evaluator
            .trim();
    }
    
    /**
     * Simple recursive descent expression parser.
     * Supports: +, -, *, /, ^/**, parentheses, sqrt, abs, log, ln, floor, ceil, round, min, max
     */
    private double evaluateExpression(String expr, double n) {
        // Replace 'n' with actual value
        String processed = expr.replace("n", String.valueOf(n));
        
        // Process functions first
        processed = processFunctions(processed);
        
        // Now evaluate the arithmetic expression
        return parseAddSub(new ParseState(processed));
    }
    
    private String processFunctions(String expr) {
        // Process functions from innermost to outermost
        while (true) {
            int changed = 0;
            
            // Find function calls and evaluate them
            String[] functions = {"sqrt", "abs", "log", "ln", "floor", "ceil", "round", "exp", "sin", "cos", "tan"};
            for (String func : functions) {
                int idx = expr.indexOf(func + "(");
                if (idx >= 0) {
                    int start = idx + func.length() + 1;
                    int depth = 1;
                    int end = start;
                    while (end < expr.length() && depth > 0) {
                        if (expr.charAt(end) == '(') depth++;
                        if (expr.charAt(end) == ')') depth--;
                        end++;
                    }
                    String inner = expr.substring(start, end - 1);
                    double innerVal = evaluateExpression(inner, 0); // n already replaced
                    double result = applyFunction(func, innerVal);
                    expr = expr.substring(0, idx) + result + expr.substring(end);
                    changed++;
                }
            }
            
            // Handle min/max with two arguments
            String[] twoArgFuncs = {"min", "max", "pow"};
            for (String func : twoArgFuncs) {
                int idx = expr.indexOf(func + "(");
                if (idx >= 0) {
                    int start = idx + func.length() + 1;
                    int depth = 1;
                    int end = start;
                    while (end < expr.length() && depth > 0) {
                        if (expr.charAt(end) == '(') depth++;
                        if (expr.charAt(end) == ')') depth--;
                        end++;
                    }
                    String inner = expr.substring(start, end - 1);
                    String[] parts = splitOnComma(inner);
                    if (parts.length == 2) {
                        double a = evaluateExpression(parts[0].trim(), 0);
                        double b = evaluateExpression(parts[1].trim(), 0);
                        double result = applyTwoArgFunction(func, a, b);
                        expr = expr.substring(0, idx) + result + expr.substring(end);
                        changed++;
                    }
                }
            }
            
            if (changed == 0) break;
        }
        return expr;
    }
    
    private String[] splitOnComma(String s) {
        // Split on comma, respecting parentheses
        int depth = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(') depth++;
            if (c == ')') depth--;
            if (c == ',' && depth == 0) {
                return new String[] { s.substring(0, i), s.substring(i + 1) };
            }
        }
        return new String[] { s };
    }
    
    private double applyFunction(String func, double val) {
        switch (func) {
            case "sqrt": return Math.sqrt(val);
            case "abs": return Math.abs(val);
            case "log": return Math.log10(val);
            case "ln": return Math.log(val);
            case "floor": return Math.floor(val);
            case "ceil": return Math.ceil(val);
            case "round": return Math.round(val);
            case "exp": return Math.exp(val);
            case "sin": return Math.sin(val);
            case "cos": return Math.cos(val);
            case "tan": return Math.tan(val);
            default: return val;
        }
    }
    
    private double applyTwoArgFunction(String func, double a, double b) {
        switch (func) {
            case "min": return Math.min(a, b);
            case "max": return Math.max(a, b);
            case "pow": return Math.pow(a, b);
            default: return a;
        }
    }
    
    // Simple recursive descent parser for arithmetic
    private static class ParseState {
        String expr;
        int pos;
        
        ParseState(String expr) {
            this.expr = expr.replaceAll("\\s+", "");
            this.pos = 0;
        }
        
        char peek() {
            return pos < expr.length() ? expr.charAt(pos) : '\0';
        }
        
        char get() {
            return pos < expr.length() ? expr.charAt(pos++) : '\0';
        }
    }
    
    private double parseAddSub(ParseState state) {
        double result = parseMulDiv(state);
        while (state.peek() == '+' || state.peek() == '-') {
            char op = state.get();
            double right = parseMulDiv(state);
            result = op == '+' ? result + right : result - right;
        }
        return result;
    }
    
    private double parseMulDiv(ParseState state) {
        double result = parsePower(state);
        while (state.peek() == '*' || state.peek() == '/') {
            char op = state.get();
            if (op == '*' && state.peek() == '*') {
                state.get(); // consume second *
                double right = parsePower(state);
                result = Math.pow(result, right);
            } else {
                double right = parsePower(state);
                result = op == '*' ? result * right : result / right;
            }
        }
        return result;
    }
    
    private double parsePower(ParseState state) {
        double result = parseUnary(state);
        // ^ is already converted to ** in convertFormula
        return result;
    }
    
    private double parseUnary(ParseState state) {
        if (state.peek() == '-') {
            state.get();
            return -parseAtom(state);
        }
        if (state.peek() == '+') {
            state.get();
        }
        return parseAtom(state);
    }
    
    private double parseAtom(ParseState state) {
        if (state.peek() == '(') {
            state.get(); // consume '('
            double result = parseAddSub(state);
            if (state.peek() == ')') state.get(); // consume ')'
            return result;
        }
        
        // Parse number
        StringBuilder sb = new StringBuilder();
        while (Character.isDigit(state.peek()) || state.peek() == '.' || state.peek() == 'E' || state.peek() == 'e') {
            sb.append(state.get());
            // Handle negative exponent
            if ((sb.charAt(sb.length() - 1) == 'E' || sb.charAt(sb.length() - 1) == 'e') 
                && (state.peek() == '+' || state.peek() == '-')) {
                sb.append(state.get());
            }
        }
        if (sb.length() == 0) return 0;
        try {
            return Double.parseDouble(sb.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
    
    /**
     * Get the original formula string.
     */
    public String getFormula() {
        return formula;
    }
}



