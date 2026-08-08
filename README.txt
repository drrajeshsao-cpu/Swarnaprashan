MAHAMAYA CLINIC — SWARNAPRASHAN V10.4 CHILD SAVE FIX

Root cause fixed:
The child registration UI displayed a native camera file input with id c_photo_camera,
but JavaScript tried to attach a click handler to a missing element c_direct_camera.
That JavaScript error stopped the rest of the child form handlers from being attached,
including Save Child Profile.

V10.4 fixes:
- Child profile uses a real, matching Open Camera Now button (c_direct_camera).
- Gallery upload works.
- Save Child Profile handler is always attached.
- Clear save status and success alert.
- Saved child immediately appears in Children Registry.
- Registry scrolls into view after save on mobile.
- Duplicate Registration ID check.
- Photo IndexedDB failures are reported instead of silently stopping.
- Children list still renders even if a photo cannot be read.
- Cache-busting updated to 10.4.0.

Deploy ALL files from this ZIP to GitHub root, wait 1–2 minutes, close/reopen the PWA or refresh browser.
