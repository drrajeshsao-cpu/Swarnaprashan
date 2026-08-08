MAHAMAYA CLINIC — SWARNAPRASHAN V10.2 FAIL-SAFE LOGIN

This build is specifically designed to eliminate the repeated login failure.

Guaranteed built-in login (works independently of saved local user records):
- drrajesh / rajesh123
- dr.raju2010@gmail.com / rajesh123
- drravi / ravi123
- superadmin / admin123

New:
- Quick Login • Dr Rajesh button.
- Login checks built-in credentials BEFORE browser localStorage.
- Session has in-memory fallback if localStorage is unavailable/corrupted.
- Reset Login Access repairs local accounts but is no longer required for the built-in login.
- app.js and styles.css use cache-busting version query ?v=10.2.0.

Security note:
This is still a static GitHub Pages prototype. These built-in credentials are intentionally visible in front-end code, so this is NOT suitable as true secure authentication for real patient data. For production, replace it with Firebase Authentication / secure backend before storing real clinical records.

Deploy:
Replace repository root files with this package.
Commit.
Wait 1–2 minutes.
Open the live URL and refresh.
Tap Quick Login • Dr Rajesh.
