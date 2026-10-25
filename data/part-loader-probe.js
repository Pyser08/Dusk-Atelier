// Dusk Atelier part-loader probe resource (intentionally inert).
// The test harness may download and inspect this text, but MUST NOT execute it.
// If a supported official loader is discovered in the future, it must be reviewed first.
export function partProbe() {
  return { marker: 'PART_PROBE_EXECUTION_MARKER', version: '1.0.0', reply: 'PONG_FROM_REMOTE_JS' };
}
