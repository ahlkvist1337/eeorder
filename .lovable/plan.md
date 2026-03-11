

## Problem

When adding an article row without a description ("benämning"), pressing Enter or clicking the add button submits the **parent form** in CreateOrder.tsx, navigating away. This happens because:

1. Buttons in `ArticleRowsEditor` lack `type="button"`, so they default to `type="submit"` inside a `<form>`.
2. `handleAddRow` silently returns when text is empty (line 42) — no validation message shown.

## Fix

### `src/components/ArticleRowsEditor.tsx`

1. **Add `type="button"` to all buttons** — lines 311, 315, 325 (mobile), 534, 537, 549 (desktop), and edit buttons (417, 420, 228-237). This prevents parent form submission.

2. **Show validation feedback** when the user tries to add a row without a description:
   - Add a local state `showTextError` that is set to `true` when `handleAddRow` is called with empty text.
   - Show a small red text ("Beskrivning krävs") below the description input when `showTextError` is true.
   - Clear the error when text changes.

| File | Change |
|------|--------|
| `src/components/ArticleRowsEditor.tsx` | Add `type="button"` to all `<Button>` elements; add validation message for empty description |

