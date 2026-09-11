import assert from 'node:assert/strict';
import { resolveInvitationFeatures, normalizeInvitationProductTier, buildInvitationTemplateDefinitions } from '../src/lib/invitationProducts.ts';

for (const legacyTier of ['standard', 'deluxe'] as const) {
  assert.equal(normalizeInvitationProductTier(legacyTier), legacyTier, 'stored tier stays compatible with historical records');
  assert.deepEqual(resolveInvitationFeatures(legacyTier, {
    maxGalleryImages: 6, showGuestbook: false, showCountdown: false, showMusic: false, shareMode: 'link',
  }), resolveInvitationFeatures('premium'), 'legacy tier limits must not disable included features');
}
assert.ok(buildInvitationTemplateDefinitions('sample').every((template) => template.productTier === 'premium'));
assert.ok(buildInvitationTemplateDefinitions('sample').every((template) => !/STANDARD|DELUXE|PREMIUM/.test(template.displayName)));

assert.equal(resolveInvitationFeatures('premium', { showGuestbook: false }).showGuestbook, false, 'explicit content controls remain supported');
console.log('Invitation product policy passed.');
