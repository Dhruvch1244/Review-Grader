import java.awt.Desktop;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.CodeSource;
import java.util.Comparator;
import java.util.Enumeration;
import java.util.Locale;
import java.util.Random;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/**
 * Self-contained launcher: this jar embeds a full Node.js runtime plus the
 * built Review Grader server and static assets as plain jar entries under
 * node/ and app/. Running the jar extracts them next to itself (once - a
 * version marker skips re-extracting on later runs) and spawns node against
 * the bundled server, so `java -jar review-grader.jar` is the entire
 * "install".
 */
public class Main {
    public static void main(String[] args) throws Exception {
        Path jarPath = jarLocation();
        Path runtimeDir = jarPath.getParent().resolve(".review-grader-runtime");
        Path versionMarker = runtimeDir.resolve(".version");
        String jarVersion = Long.toString(jarPath.toFile().lastModified()) + ":" + jarPath.toFile().length();

        if (!isExtracted(versionMarker, jarVersion)) {
            System.out.println("Review Grader - preparing (first run only, this can take a few seconds)...");
            if (Files.exists(runtimeDir)) deleteRecursive(runtimeDir);
            Files.createDirectories(runtimeDir);
            extractResources(jarPath, runtimeDir);
            Files.writeString(versionMarker, jarVersion);
        }

        boolean windows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
        Path nodeExe = runtimeDir.resolve(windows ? "node/node.exe" : "node/node");
        nodeExe.toFile().setExecutable(true);
        Path serverJs = runtimeDir.resolve("app/dist/server.js");

        int port = 30000 + new Random().nextInt(10000);
        String hostname = System.getenv().getOrDefault("HOSTNAME", "0.0.0.0");

        ProcessBuilder pb = new ProcessBuilder(nodeExe.toString(), serverJs.toString());
        pb.environment().put("PORT", String.valueOf(port));
        pb.environment().put("HOSTNAME", hostname);
        pb.environment().put("NODE_ENV", "production");
        pb.directory(runtimeDir.resolve("app").toFile());
        Path logFile = runtimeDir.resolve("server.log");
        pb.redirectOutput(logFile.toFile());
        pb.redirectError(logFile.toFile());

        Process server = pb.start();
        Runtime.getRuntime().addShutdownHook(new Thread(server::destroy));

        System.out.println();
        System.out.println("  Review Grader");
        System.out.println("  Starting on port " + port + " ...");

        boolean up = waitForPort("localhost", port, 20_000);
        if (!up) {
            System.out.println("  Server did not come up in time - check " + logFile + " for details.");
        }

        System.out.println();
        System.out.println("  Running at http://localhost:" + port);
        System.out.println("  Other devices on the same WiFi can reach it at http://YOUR-IP:" + port);
        System.out.println();
        System.out.println("  Leave this window open while you use Review Grader.");
        System.out.println("  Close this window (or press Ctrl+C) to stop the server.");
        System.out.println();

        if (up) {
            try {
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(new URI("http://localhost:" + port));
                }
            } catch (Exception e) {
                System.out.println("  (couldn't auto-open a browser - visit the URL above manually)");
            }
        }

        server.waitFor();
    }

    private static Path jarLocation() throws Exception {
        CodeSource src = Main.class.getProtectionDomain().getCodeSource();
        return Paths.get(src.getLocation().toURI()).toAbsolutePath();
    }

    private static boolean isExtracted(Path versionMarker, String jarVersion) {
        try {
            return Files.exists(versionMarker) && Files.readString(versionMarker).trim().equals(jarVersion);
        } catch (IOException e) {
            return false;
        }
    }

    private static boolean waitForPort(String host, int port, long timeoutMs) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(host, port), 300);
                return true;
            } catch (IOException e) {
                try {
                    Thread.sleep(200);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }
        return false;
    }

    private static void extractResources(Path jarPath, Path targetDir) throws IOException {
        try (JarFile jar = new JarFile(jarPath.toFile())) {
            Enumeration<JarEntry> entries = jar.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                String name = entry.getName();
                if (!name.startsWith("node/") && !name.startsWith("app/")) continue;
                Path outPath = targetDir.resolve(name);
                if (entry.isDirectory()) {
                    Files.createDirectories(outPath);
                    continue;
                }
                Files.createDirectories(outPath.getParent());
                try (InputStream in = jar.getInputStream(entry)) {
                    Files.copy(in, outPath, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
    }

    private static void deleteRecursive(Path path) throws IOException {
        if (!Files.exists(path)) return;
        try (var walk = Files.walk(path)) {
            walk.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.delete(p);
                } catch (IOException ignored) {
                    // best-effort cleanup before a fresh extract
                }
            });
        }
    }
}
