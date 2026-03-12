

## Problem

The current edge function sends the PDF's base64 data as **plain text** in the AI prompt. The model is trying to interpret raw base64 characters as document content, which is why results are wildly inconsistent -- it's essentially guessing from garbled text.

## Fix

Use Gemini's **native multimodal input** to send the PDF as a proper binary document (`inline_data` with `mime_type: "application/pdf"`). This lets the model actually "see" the PDF pages and extract data accurately and consistently.

### Changes to `supabase/functions/parse-pdf-order/index.ts`

1. **Switch to `temperature: 0`** to minimize randomness in extraction.
2. **Send the PDF as `inline_data`** instead of embedding base64 in the text prompt. The Gemini API supports PDF files natively via the `inline_data` content part.
3. **Use `google/gemini-2.5-flash`** which handles multimodal PDF input well.

The key change in the API call body:

```typescript
messages: [
  { role: "system", content: systemPrompt },
  {
    role: "user",
    content: [
      { type: "text", text: "Extrahera orderdata från denna PDF." },
      {
        type: "image_url",
        image_url: {
          url: `data:application/pdf;base64,${pdfBase64}`,
        },
      },
    ],
  },
],
temperature: 0,
```

This sends the actual PDF binary to the vision model instead of raw base64 text. Combined with `temperature: 0`, results will be consistent across runs.

| File | Change |
|------|--------|
| `supabase/functions/parse-pdf-order/index.ts` | Switch from text-based base64 to multimodal `inline_data` PDF input; add `temperature: 0` |

