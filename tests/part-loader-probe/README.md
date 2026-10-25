# Part Loader Probe (temporary test kit)

- `dusk_part_probe.js`: temporary RisuAI API v3 diagnostic plugin.
- `PART-LOADER-CHECKLIST.md`: manual test checklist.
- Remote fixtures are hosted in `data/part-loader-probe.json` and `data/part-loader-probe.js` on the Dusk Atelier repository's main branch.

This is a diagnostic-only tool. It does not execute remote JavaScript, use eval/new Function, or bypass the sandbox. Remove the temporary probe plugin after testing.
