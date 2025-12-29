package chess;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * HTTP server that exposes the chess engine API.
 */
public class EngineServer {
    
    private final Engine engine;
    private HttpServer server;
    private final int port;
    
    public EngineServer(int port) {
        this.port = port;
        this.engine = new Engine();
    }
    
    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        
        // CORS handler wrapper
        server.createContext("/api/init", cors(this::handleInit));
        server.createContext("/api/newGame", cors(this::handleNewGame));
        server.createContext("/api/setFen", cors(this::handleSetFen));
        server.createContext("/api/setStartPos", cors(this::handleSetStartPos));
        server.createContext("/api/makeMove", cors(this::handleMakeMove));
        server.createContext("/api/search", cors(this::handleSearch));
        server.createContext("/api/getInfo", cors(this::handleGetInfo));
        server.createContext("/api/getFen", cors(this::handleGetFen));
        server.createContext("/api/sideToMove", cors(this::handleSideToMove));
        server.createContext("/api/gameStatus", cors(this::handleGameStatus));
        server.createContext("/api/evaluate", cors(this::handleEvaluate));
        server.createContext("/api/getMoves", cors(this::handleGetMoves));
        server.createContext("/api/stop", cors(this::handleStop));
        server.createContext("/health", cors(this::handleHealth));
        
        // Evaluator API endpoints
        server.createContext("/api/setEvaluator", cors(this::handleSetEvaluator));
        server.createContext("/api/getEvaluator", cors(this::handleGetEvaluator));
        server.createContext("/api/getEvaluators", cors(this::handleGetEvaluators));
        server.createContext("/api/configureCustomEval", cors(this::handleConfigureCustomEval));
        server.createContext("/api/getCustomEvalConfig", cors(this::handleGetCustomEvalConfig));
        server.createContext("/api/configureRuleEval", cors(this::handleConfigureRuleEval));
        
        server.setExecutor(null);
        server.start();
        
        System.out.println("Chess Engine Server started on port " + port);
    }
    
    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }
    
    private HttpHandler cors(HttpHandler handler) {
        return exchange -> {
            // Add CORS headers
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            handler.handle(exchange);
        };
    }
    
    private void handleHealth(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"status\":\"ok\"}");
    }
    
    private void handleInit(HttpExchange exchange) throws IOException {
        engine.newGame();
        sendJson(exchange, "{\"success\":true}");
    }
    
    private void handleNewGame(HttpExchange exchange) throws IOException {
        engine.newGame();
        sendJson(exchange, "{\"success\":true}");
    }
    
    private void handleSetFen(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseBody(exchange);
        String fen = params.get("fen");
        if (fen != null) {
            engine.setFen(fen);
            sendJson(exchange, "{\"success\":true}");
        } else {
            sendJson(exchange, "{\"success\":false,\"error\":\"Missing fen parameter\"}");
        }
    }
    
    private void handleSetStartPos(HttpExchange exchange) throws IOException {
        engine.setStartPos();
        sendJson(exchange, "{\"success\":true}");
    }
    
    private void handleMakeMove(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseBody(exchange);
        String move = params.get("move");
        if (move != null) {
            boolean success = engine.makeMove(move);
            sendJson(exchange, "{\"success\":" + success + "}");
        } else {
            sendJson(exchange, "{\"success\":false,\"error\":\"Missing move parameter\"}");
        }
    }
    
    private void handleSearch(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseBody(exchange);
        int depth = 0;
        int time = 0;
        
        if (params.containsKey("depth")) {
            try {
                depth = Integer.parseInt(params.get("depth"));
            } catch (NumberFormatException e) {}
        }
        if (params.containsKey("time")) {
            try {
                time = Integer.parseInt(params.get("time"));
            } catch (NumberFormatException e) {}
        }
        
        String bestMove = engine.search(depth, time);
        sendJson(exchange, "{\"bestMove\":\"" + bestMove + "\"}");
    }
    
    private void handleGetInfo(HttpExchange exchange) throws IOException {
        sendJson(exchange, engine.getInfo());
    }
    
    private void handleGetFen(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"fen\":\"" + engine.getFen() + "\"}");
    }
    
    private void handleSideToMove(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"sideToMove\":" + engine.sideToMove() + "}");
    }
    
    private void handleGameStatus(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"status\":" + engine.gameStatus() + "}");
    }
    
    private void handleEvaluate(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"score\":" + engine.evaluate() + "}");
    }
    
    private void handleGetMoves(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"moves\":" + engine.getMoves() + "}");
    }
    
    private void handleStop(HttpExchange exchange) throws IOException {
        engine.stop();
        sendJson(exchange, "{\"success\":true}");
    }
    
    private void handleSetEvaluator(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseBody(exchange);
        String name = params.get("name");
        if (name != null) {
            boolean success = engine.setEvaluator(name);
            if (success) {
                sendJson(exchange, "{\"success\":true,\"evaluator\":\"" + engine.getEvaluatorName() + "\"}");
            } else {
                sendJson(exchange, "{\"success\":false,\"error\":\"Unknown evaluator: " + name + "\"}");
            }
        } else {
            sendJson(exchange, "{\"success\":false,\"error\":\"Missing name parameter\"}");
        }
    }
    
    private void handleGetEvaluator(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"name\":\"" + engine.getEvaluatorName() + 
            "\",\"description\":\"" + engine.getEvaluatorDescription() + "\"}");
    }
    
    private void handleGetEvaluators(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"evaluators\":" + engine.getAvailableEvaluators() + "}");
    }
    
    private void handleConfigureCustomEval(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseBody(exchange);
        try {
            int pawnValue = parseIntOrDefault(params.get("pawnValue"), 100);
            int knightValue = parseIntOrDefault(params.get("knightValue"), 320);
            int bishopValue = parseIntOrDefault(params.get("bishopValue"), 330);
            int rookValue = parseIntOrDefault(params.get("rookValue"), 500);
            int queenValue = parseIntOrDefault(params.get("queenValue"), 900);
            int mobilityWeight = parseIntOrDefault(params.get("mobilityWeight"), 10);
            int kingSafetyWeight = parseIntOrDefault(params.get("kingSafetyWeight"), 1);
            int pawnAdvanceWeight = parseIntOrDefault(params.get("pawnAdvanceWeight"), 20);
            int centerControlWeight = parseIntOrDefault(params.get("centerControlWeight"), 10);
            int bishopPairBonus = parseIntOrDefault(params.get("bishopPairBonus"), 50);
            int rookOnOpenFileBonus = parseIntOrDefault(params.get("rookOnOpenFileBonus"), 25);
            int passedPawnBonus = parseIntOrDefault(params.get("passedPawnBonus"), 50);
            int doubledPawnPenalty = parseIntOrDefault(params.get("doubledPawnPenalty"), 20);
            int isolatedPawnPenalty = parseIntOrDefault(params.get("isolatedPawnPenalty"), 15);
            int castlingBonus = parseIntOrDefault(params.get("castlingBonus"), 60);
            
            engine.configureCustomEval(
                pawnValue, knightValue, bishopValue, rookValue, queenValue,
                mobilityWeight, kingSafetyWeight, pawnAdvanceWeight,
                centerControlWeight, bishopPairBonus, rookOnOpenFileBonus,
                passedPawnBonus, doubledPawnPenalty, isolatedPawnPenalty, castlingBonus
            );
            
            sendJson(exchange, "{\"success\":true,\"config\":" + engine.getCustomEvalConfig() + "}");
        } catch (NumberFormatException e) {
            sendJson(exchange, "{\"success\":false,\"error\":\"Invalid number format\"}");
        }
    }
    
    private void handleGetCustomEvalConfig(HttpExchange exchange) throws IOException {
        sendJson(exchange, "{\"config\":" + engine.getCustomEvalConfig() + "}");
    }
    
    private void handleConfigureRuleEval(HttpExchange exchange) throws IOException {
        try {
            // Read raw body for rule-based eval configuration
            String body;
            try (InputStream is = exchange.getRequestBody()) {
                body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }
            
            // Parse the JSON configuration
            // Expected format: { name, description, rules: [...], categoryWeights: {...} }
            String name = extractJsonString(body, "name");
            String description = extractJsonString(body, "description");
            String rulesJson = extractJsonArray(body, "rules");
            String categoryWeightsJson = extractJsonObject(body, "categoryWeights");
            
            boolean success = engine.configureRuleEval(name, description, rulesJson, categoryWeightsJson);
            
            if (success) {
                sendJson(exchange, "{\"success\":true,\"message\":\"Rule evaluator configured\"}");
            } else {
                sendJson(exchange, "{\"success\":false,\"error\":\"Failed to configure rule evaluator\"}");
            }
        } catch (Exception e) {
            sendJson(exchange, "{\"success\":false,\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}");
        }
    }
    
    private String extractJsonString(String json, String key) {
        int keyIndex = json.indexOf("\"" + key + "\"");
        if (keyIndex < 0) return null;
        
        int colonIndex = json.indexOf(":", keyIndex);
        if (colonIndex < 0) return null;
        
        int startQuote = json.indexOf("\"", colonIndex);
        if (startQuote < 0) return null;
        
        int endQuote = json.indexOf("\"", startQuote + 1);
        while (endQuote > 0 && json.charAt(endQuote - 1) == '\\') {
            endQuote = json.indexOf("\"", endQuote + 1);
        }
        if (endQuote < 0) return null;
        
        return json.substring(startQuote + 1, endQuote);
    }
    
    private String extractJsonArray(String json, String key) {
        int keyIndex = json.indexOf("\"" + key + "\"");
        if (keyIndex < 0) return null;
        
        int colonIndex = json.indexOf(":", keyIndex);
        if (colonIndex < 0) return null;
        
        int start = json.indexOf("[", colonIndex);
        if (start < 0) return null;
        
        int depth = 1;
        int end = start + 1;
        while (depth > 0 && end < json.length()) {
            char c = json.charAt(end);
            if (c == '[') depth++;
            if (c == ']') depth--;
            end++;
        }
        
        return json.substring(start, end);
    }
    
    private String extractJsonObject(String json, String key) {
        int keyIndex = json.indexOf("\"" + key + "\"");
        if (keyIndex < 0) return null;
        
        int colonIndex = json.indexOf(":", keyIndex);
        if (colonIndex < 0) return null;
        
        int start = json.indexOf("{", colonIndex);
        if (start < 0) return null;
        
        int depth = 1;
        int end = start + 1;
        while (depth > 0 && end < json.length()) {
            char c = json.charAt(end);
            if (c == '{') depth++;
            if (c == '}') depth--;
            end++;
        }
        
        return json.substring(start, end);
    }
    
    private int parseIntOrDefault(String value, int defaultValue) {
        if (value == null || value.isEmpty()) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
    
    private void sendJson(HttpExchange exchange, String json) throws IOException {
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
    
    private Map<String, String> parseBody(HttpExchange exchange) throws IOException {
        Map<String, String> params = new HashMap<>();
        
        // Parse query string for GET requests
        String query = exchange.getRequestURI().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                String[] kv = param.split("=", 2);
                if (kv.length == 2) {
                    params.put(kv[0], java.net.URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
                }
            }
        }
        
        // Parse JSON body for POST requests
        if ("POST".equals(exchange.getRequestMethod())) {
            try (InputStream is = exchange.getRequestBody()) {
                String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                if (body.startsWith("{")) {
                    // Simple JSON parsing
                    body = body.substring(1, body.length() - 1);
                    for (String part : body.split(",")) {
                        String[] kv = part.split(":", 2);
                        if (kv.length == 2) {
                            String key = kv[0].trim().replace("\"", "");
                            String value = kv[1].trim().replace("\"", "");
                            params.put(key, value);
                        }
                    }
                }
            }
        }
        
        return params;
    }
    
    public static void main(String[] args) {
        int port = 8765;
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.err.println("Invalid port number: " + args[0]);
            }
        }
        
        EngineServer server = new EngineServer(port);
        try {
            server.start();
            
            // Keep running
            System.out.println("Press Ctrl+C to stop the server");
            Thread.currentThread().join();
        } catch (IOException e) {
            System.err.println("Failed to start server: " + e.getMessage());
        } catch (InterruptedException e) {
            server.stop();
        }
    }
}

