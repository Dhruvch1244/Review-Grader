<!-- BEGIN:angular-agent-rules -->
# Angular 17 + signals, not the Angular you might expect

`apps/web` is Angular 17.3, standalone components only (no NgModules), built
around signals (`signal()`, `computed()`, `effect()`, `input()`, `output()`)
rather than RxJS/Zone-based patterns for component state. Two things that
differ from older training data and are easy to get wrong:

- **NG0600**: `effect()` throws if it writes to a signal (directly, or
  indirectly - e.g. calling a service method that does) unless the effect
  is created with `effect(fn, { allowSignalWrites: true })`. This fails
  silently in the sense that the effect just stops running past the throw -
  it does not crash the page, so a broken effect can look like "nothing
  happens" rather than a visible error. Check the browser console.
- **`@let` template syntax requires Angular 18.1+** and will hard-fail to
  parse on this app's Angular 17.3. Some npm packages (icon libraries in
  particular) ship newer releases that emit `@let` in their compiled
  templates - pin to a version that predates it if a dependency bump starts
  failing with "Incomplete block \"let ...\"".

`apps/api` is a plain Express + TypeScript server, nothing unusual there.
<!-- END:angular-agent-rules -->
