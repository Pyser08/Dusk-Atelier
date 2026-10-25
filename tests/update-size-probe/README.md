# Dusk Atelier update-size probe (temporary)

This branch contains test-only plugins used to measure RisuAI plugin update behavior with large source files.

## Test targets

- 1 MiB (1,048,576 bytes)
- 1.2 MiB (1,228,800 bytes)
- 2 MiB (2,097,152 bytes)

Each target plugin has the same plugin identity as its matching small seed plugin, but its version is 0.2.0. Each seed is version 0.1.0 and points its update URL at the hosted target file on this branch.

## Procedure

For each environment separately (official RisuAI and RisuBard):

1. Import the matching small seed plugin:
   - [seed-1mb.js](seed-1mb.js)
   - [seed-12mb.js](seed-12mb.js)
   - [seed-2mb.js](seed-2mb.js)
2. Confirm the plugin appears as **Dusk Update Size Probe ... v0.1.0 (seed)**.
3. Run the app's normal plugin update check / update action. Do not manually import the large target.
4. Confirm the update completes and the installed plugin is now version 0.2.0; its setting label should end with v0.2.0.
5. Restart the app and confirm the v0.2.0 plugin loads again.
6. Record download/import errors separately from execution or restart errors.

## Important

- This tests the update path, not just initial import.
- The large files are padded with a JavaScript block comment; executable code is small.
- Do not install the test plugins in a production profile unless you are comfortable with temporary diagnostic plugins.
- Test files are isolated to this branch and should not be merged into main.
- A successful 2 MiB test demonstrates success for that tested version/environment, not a universal size limit.
