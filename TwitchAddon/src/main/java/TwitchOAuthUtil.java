import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.json.JSONObject;

public class TwitchOAuthUtil {
    /**
     * Holt ein neues OAuth-Access-Token mit dem Refresh-Token von Twitch.
     * @return Neues Access-Token (ohne "oauth:"-Prefix), oder null bei Fehler.
     */
    public static String refreshAccessToken(String clientId, String clientSecret, String refreshToken) throws IOException, InterruptedException {
        String url = "https://id.twitch.tv/oauth2/token";
        String body = "grant_type=refresh_token"
                + "&refresh_token=" + refreshToken
                + "&client_id=" + clientId
                + "&client_secret=" + clientSecret;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            JSONObject json = new JSONObject(response.body());
            return json.getString("access_token");
        } else {
            System.err.println("[TwitchOAuthUtil] Fehler beim Refresh: " + response.statusCode() + " | " + response.body());
            return null;
        }
    }
}

