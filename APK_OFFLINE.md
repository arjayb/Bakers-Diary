# Baker's Diary — Offline Android v1

This branch adds an Android target while preserving the existing hosted web application.

## Product decision

The first APK is intentionally **single-device and offline-first**. There is no multi-device sync in v1, so there is no cross-device conflict-resolution problem.

### Works offline
- Recipe library and recipe editing
- Structured ingredients and method steps
- Guided bake sessions, autosaved progress and notes
- Journal / bake history
- Grocery list and add-from-recipe
- Ingredient-aware unit conversion (conversion math is bundled in the APK)
- Day/Night settings
- Photo attachments stored locally in the app data store

### Internet-dependent / deferred
- Live nutrition-provider lookup and rematching
- Cloud backup
- Multi-device synchronization
- Cloud media upload

## Architecture

The React/Vite UI remains shared with the web edition. `src/api/client.js` detects the Capacitor native runtime and routes the existing API surface to `src/api/offlineStore.js`; the normal web build continues to use the Express backend. This keeps the screen components largely unchanged.

The offline v1 store uses device-local WebView storage. This is deliberate for the first single-device proof build. Before a public production release, migrate the persistence adapter to SQLite and add export/restore backup so large photo libraries do not depend on WebView quota/eviction behavior.

## Android build

Requirements: Node.js, Android Studio/Android SDK, and a Java version supported by the selected Capacitor/Android Gradle toolchain.

```bash
cd frontend
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

For a command-line debug APK after the Android project exists:

Windows:
```powershell
cd android
.\gradlew.bat assembleDebug
```

macOS/Linux:
```bash
cd android
./gradlew assembleDebug
```

Expected debug output:
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## Release gate

Do not call this production-ready until these are proven on a physical Android device in airplane mode:
1. Cold launch with no network.
2. Create/edit/delete a recipe (delete only when no bake history exists).
3. Start, interrupt, relaunch, and resume a bake.
4. Complete a bake and verify Journal history.
5. Add/toggle/delete groceries and add ingredients from a recipe.
6. Run weight, volume, temperature, and ingredient-density conversions.
7. Attach photos, kill/relaunch the app, and verify they remain visible.
8. Switch theme, kill/relaunch, and verify persistence.
9. Confirm the hosted web edition still uses the server API.
10. Add backup/export before distributing the APK as a user-data-safe release.
