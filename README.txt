SWARNAPRASHAN PRO V7 — WORLD-CLASS CLINICAL PWA

Major additions in V7
- Child profile baby photo from camera or gallery.
- Dedicated Documents & Camera center.
- Manual Swarnaprashan card capture.
- Investigation report, clinical photo, previous prescription, growth record, vaccination record and consent uploads.
- Camera/gallery/file/PDF attachments inside clinical workflow.
- Follow-up-specific camera/file attachments.
- Guided Save & Next workflow:
  Profile → Examination → Investigations → Treatment → Prescription → Review & Share.
- Growth, BMI and functional longitudinal analytics with line, column and pie charts.
- Vaccination & schedule module.
- Digital Swarnaprashan prescription and parent report.
- Print / Save PDF / Share / WhatsApp.
- JSON backup and CSV export.

Architecture note:
Structured records use localStorage.
Binary files/photos/PDFs use IndexedDB.
For true multi-device production use, migrate to secure authenticated cloud storage/database with audit log, role-based access and encrypted backups.
