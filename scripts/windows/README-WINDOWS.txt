Review Grader - Windows release
================================

1. Unzip this folder anywhere (Desktop is fine).
2. Double-click start.bat.
3. A browser window opens automatically once the server is ready
   (usually 2-3 seconds). A random port is picked each time, so re-running
   start.bat later may open a different port - that's expected.
4. Other people on the same WiFi can reach it too: the console window
   prints a URL like http://YOUR-IP:PORT for them to use.

Stopping it: close the "Review Grader Server" window (it starts minimized -
check your taskbar), or end node.exe from Task Manager. Closing the main
console window does NOT stop the server by itself; use one of those instead.

Your data (classes, scores, the question bank) is stored at:
  %USERPROFILE%\.review-grader\review-grader.db
It persists between runs. To start completely fresh, close the server and
delete that folder - the 6 classes and rubric will regenerate automatically
next time you start it.

No installation required - Node.js is bundled in the "node" folder next to
this file, so you don't need anything else installed on your machine.
