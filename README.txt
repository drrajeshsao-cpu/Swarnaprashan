MAHAMAYA CLINIC SWARNAPRASHAN V11.2 — FIREBASE CLOUD SYNC

Firebase project:
MAHAMAYA-SWARNAPRASHAN-CLOUD
Plan: Spark / no-cost

PHASE 1 CLOUD SYNC
Automatically synchronized:
- Children registry and operational status
- Clinical cases / clinical workspace structured data
- Monthly follow-ups
- Growth-related structured follow-up data
- Vaccination / schedule entries
- Diet / plans
- Clinic & prescription settings

DEVICE-LOCAL IN PHASE 1
- Baby identity photo blobs
- Investigation/report images
- Manual prescription/card photos
- Uploaded PDFs/files
These are stored in IndexedDB and are NOT uploaded in this Spark-phase package.
Firebase Cloud Storage can be added later if desired; that is a separate billing/security decision.

FIRST LAPTOP TEST
1. Deploy ALL root files to GitHub Pages.
2. Open/reload the Swarnaprashan app.
3. Sign in with the Firebase account already created.
4. If cloud is empty, existing structured laptop records upload automatically.
5. Wait for "Synced".
6. Open the same app URL on mobile.
7. Sign in with the SAME account.
8. Confirm children/cases/follow-ups appear on mobile.
9. Create one small test child or follow-up on mobile and confirm it appears on laptop.

IMPORTANT
Do not delete local backups until laptop <-> mobile synchronization has been verified.

CURRENT FIRESTORE RULES
For first-user testing, access is restricted to:
dr.raju2010@gmail.com

Before adding Dr Ravi or staff, update Firestore rules to role-based shared-clinic access.
