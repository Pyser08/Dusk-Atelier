import test from 'node:test';
import assert from 'node:assert/strict';
import { installHudModule, uninstallHudModule, hasHud } from '../src/engine/affhud.js';

test('모듈 HUD: 배경 HTML에 넣고 빼도 원래 내용은 그대로', () => {
  const m = { id: 'm1', name: 'x', backgroundEmbedding: '<style>a{}</style>' };
  const on = installHudModule(m);
  assert.ok(hasHud(on.backgroundEmbedding));
  assert.ok(on.backgroundEmbedding.startsWith('<style>a{}</style>'));
  assert.equal(installHudModule(on).backgroundEmbedding, on.backgroundEmbedding); // 다시 설치해도 하나만
  assert.equal(uninstallHudModule(on).backgroundEmbedding, '<style>a{}</style>');
  assert.equal('defaultVariables' in on, false);
});
