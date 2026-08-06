Review Grader - Windows release
================================

1. Unzip this folder anywhere (Desktop is fine).
2. Double-click start.bat.
3. The first run takes a few extra seconds to unpack itself - after that,
   a browser window opens automatically once the server is ready. A random
   port is picked each time, so re-running start.bat later may open a
   different port - that's expected.
4. Other people on the same WiFi can reach it too: the console window
   prints a URL like http://YOUR-IP:PORT for them to use.

Stopping it: close the console window (or press Ctrl+C inside it). That's
the only window this uses - closing it stops the server.

Your data (classes, scores, the question bank) is stored at:
  %USERPROFILE%\.review-grader\review-grader.db
It persists between runs. To start completely fresh, close the server and
delete that folder - the 6 classes and rubric will regenerate automatically
next time you start it.

No installation required - everything (a Java runtime, a Node.js runtime,
and the app itself) is bundled in this folder, so you don't need anything
else installed on your machine. review-grader.jar is the whole app in one
file; start.bat just runs it with the bundled Java runtime.
