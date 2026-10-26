# Three motion samples implementation plan

**Goal:** Produce three inspectable 3D exercise samples for JY FITNESS ATLAS and connect the project to a user-owned private GitHub repository when account access is available.

**Architecture:** Keep the current static site. Add a separate motion sample page with locally bundled 3D playback, play/pause, speed, timeline and camera controls. Store each sample as a GLB with provenance and an explicit sample status, outside the published tutorial catalogue.

**Tech stack:** Existing Node static server, Google model-viewer, glTF binary assets, Python asset inspection/generation and Node tests.

**User update:** The user created and selected the public repository `JasonCccxx/Fitness-app`, replacing the earlier private-repository proposal. Use that repository and preserve its audience.

## Tasks

1. Inspect the GitHub connection, Site identity and local source. Create private repository `jy-fitness-atlas` after GitHub web sign-in is available. Do not overwrite an existing repository.
2. Inspect upstream model and motion licenses separately. Select squat, push-up and dumbbell curl as representative samples; replace a sample or author an original motion if its reusable source cannot be established.
3. Prepare three local GLBs and retain the original license notices, pinned source and asset hashes. Inspect animation duration, joint motion and equipment contact before publishing.
4. Add `site/dist/motion-lab/index.html`, its CSS/JS and local vendor/asset files. Show one model at a time, responsive controls, a loading/error state and links back to the original site.
5. Verify HTTP delivery for the page and GLB assets, syntax and existing tests. Inspect all three samples visually in the browser, including alternate views and playback controls. Save preview artifacts.
6. Update step documents with the actual implementation, source limitations and GitHub status. Synchronize/publish through the existing Site workflow when its source host is reachable; otherwise retain the complete local result and report the exact blocker.

## Acceptance

- Three genuinely animated 3D samples load, can be paused, scrubbed, slowed and viewed from different angles.
- No dependency on a third-party model CDN during normal playback.
- Samples remain visibly distinct from reviewed training tutorials.
- Original site navigation and search continue to work.
- GitHub repository creation/synchronization is reported only after verification.
