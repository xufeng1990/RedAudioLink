# Fix Audio Parse Test Data Override

## What & Why
A debug line was left in `RecordingTestScreen.tsx` that overwrites the real API response with hardcoded mock data (`testAudioParseResult()`) every time audio is parsed. This means real device readings are never used, which likely also explains why reports remain empty — the full inspection flow may not be completing correctly with mock data.

## Done looks like
- After a successful audio parse, the actual device data returned by the API is used (not replaced by test data)
- Reports are saved and appear under the task after completing the inspection flow
- No duplicate variable declaration syntax error in `RecordingTestScreen.tsx`

## Out of scope
- Changes to the audio parsing API or external server
- UI redesign of the recording screen

## Steps
1. **Remove the test data override** — Delete the line `parsed = testAudioParseResult()` (line 379) in `tryUploadCumulative`. Ensure the real `parsed` value from the API response flows through to the rest of the function correctly.
2. **Verify report saving flow** — Trace what happens after a successful parse through to `POST /api/tasks/:taskId/reports`. Confirm the report submission is triggered correctly with real data and check for any conditions that might silently skip saving.

## Relevant files
- `mobile/src/screens/RecordingTestScreen.tsx:351-400`
