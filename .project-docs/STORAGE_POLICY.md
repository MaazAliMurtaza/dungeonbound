# Repository and artifact storage

The private GitHub repository is the durable source for code, final game assets, source Word documents, verified reports and selected test evidence. Never commit credentials, local databases, signing material, node_modules, native build directories or process-ID files.

Use cloud build runners for Android builds. Store installable APKs as private release assets or expiring build artifacts, not ordinary Git blobs. Download only the artifact needed for a device test, verify its hash, and remove the local download after the test. Keep only a single active source checkout when one is needed for implementation.

Delete task-created temporary staging directories after a build concludes and its useful results are recorded. Cleanup must resolve and verify every absolute target against the workspace or the exact task-created temporary directory. Never sweep system TEMP, user downloads, shared SDK caches or unrelated projects.

Local .env and signing material must stay out of uploads. Before removing any unique local source or evidence, confirm that the intended remote commit/artifact contains it. A successful local commit alone is not proof of an uploaded backup.
