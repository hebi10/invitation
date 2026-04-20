# Theme Extension Test Plan

## Command
- Baseline validation: `npm run validate:theme-extension`
- After adding a new theme: `npm run validate:theme-extension -- --expected-theme-count=3`

## Automated checks
1. Theme registry count
   - Confirms the shared theme registry contains at least the expected number of themes.
2. Web wizard registry wiring
   - Confirms `src/app/page-wizard/steps/ThemeStep.tsx` renders by iterating `INVITATION_THEME_KEYS`.
3. Mobile manage registry wiring
   - Confirms `apps/mobile/src/features/screens/manage.tsx` uses linked theme helpers for labels and preview URLs.
4. Linked theme save/restore
   - Builds a linked invitation card with every registered theme, restores it through storage normalization, and checks the linked theme list is preserved.
5. Ticket modal purchase logic
   - Confirms a newly added theme is considered purchasable when it is not yet linked to the current invitation.
6. Default theme change preview URL
   - Confirms preview URLs still resolve correctly after changing the default theme.
7. Deep link routing
   - Confirms both app-scheme and web deep links preserve a newly added theme key.

## Manual checks
1. Web wizard selection
   - Start the Next app and open `/page-wizard`.
   - Confirm the new theme appears in the design selection UI with the correct label and description.
2. Mobile manage labels and previews
   - Start Expo and open the manage screen for an invitation that links 3 themes.
   - Confirm the linked design list shows all theme labels and each preview link opens the correct URL.
3. Linked theme restore after app restart
   - Link an invitation with 3 themes, restart the app, then return to manage.
   - Confirm the linked theme list and preview modal still show the same 3 themes.
4. Ticket modal purchase flow
   - Open the ticket modal on an invitation that already links 2 themes.
   - Confirm the 3rd theme appears as a selectable purchase target and the CTA state is correct.
5. Default theme change runtime
   - Change the default theme to the new theme, save, then reopen previews.
   - Confirm the default route and preview URLs both point to the updated theme.

## Done
- A new theme should require renderer creation plus registry registration.
- If the validation script or manual checklist requires extra per-theme code edits, the extension structure is regressing.
