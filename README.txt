MAHAMAYA CLINIC — SWARNAPRASHAN V10.3 INLINE LOGIN FIX

Purpose:
This build fixes the case where the visible Quick Login button had no response.

How:
- Quick Login now has its own inline JavaScript in index.html.
- It does NOT depend on app.js event binding.
- It writes the login session directly and opens the app shell immediately.
- Manual built-in login also has an inline fallback.
- CSS/JS cache version bumped to 10.3.0.

Use:
1. Upload ALL root files from this ZIP.
2. Commit.
3. Wait 1–2 minutes.
4. Close the installed app completely and reopen it.
5. Tap Quick Login • Dr Rajesh.

Built-in manual login:
drrajesh / rajesh123

Important:
This is still a static GitHub Pages prototype. For real secure patient data, Firebase Auth/backend authentication is required.
