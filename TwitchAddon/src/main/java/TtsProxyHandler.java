import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.OutputStream;
import java.io.IOException;
import java.net.URI;

public class TtsProxyHandler implements HttpHandler {
    private final java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String query = exchange.getRequestURI().getQuery();
        String text = "";

        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("text=")) {
                    text = java.net.URLDecoder.decode(param.substring(5), java.nio.charset.StandardCharsets.UTF_8);
                    break;
                }
            }
        }

        if (text.isEmpty()) {
            exchange.sendResponseHeaders(400, 0);
            exchange.close();
            return;
        }

        // Google Translate TTS URL
        String ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&tl=de&client=tw-ob&q="
                + java.net.URLEncoder.encode(text, java.nio.charset.StandardCharsets.UTF_8);

        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(URI.create(ttsUrl))
                .header("User-Agent", "Mozilla/5.0") // Wichtig, um 404 zu vermeiden
                .GET()
                .build();

        try {
            java.net.http.HttpResponse<byte[]> response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() == 200) {
                byte[] audioData = response.body();
                exchange.getResponseHeaders().add("Content-Type", "audio/mpeg");
                // CORS Header hinzufügen, falls nötig (für OBS oft hilfreich)
                exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

                exchange.sendResponseHeaders(200, audioData.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(audioData);
                }
            } else {
                exchange.sendResponseHeaders(response.statusCode(), 0);
            }
        } catch (InterruptedException e) {
            exchange.sendResponseHeaders(500, 0);
        } finally {
            exchange.close();
        }
    }
}