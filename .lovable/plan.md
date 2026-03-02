

# Lagg till instruktioner + redigera artikelrader vid XML-import

## Vad som andras

### 1. InstructionsEditor -- lagg till "Lagg till instruktion"-knapp

Komponenten saknar idag mojlighet att lagga till nya instruktioner. Lagga till:
- En "Lagg till"-knapp langst ner (som i ArticleRowsEditor)
- Ett inline-formuler med ett textfalt och spara/avbryt-knappar
- Nya instruktioner far ett genererat UUID och radnummer

### 2. CreateOrder.tsx -- ersatt statisk artikelradslista med ArticleRowsEditor

Idag visas XML-importerade artikelrader som en enkel `<ul>`-lista (rad 419-431) utan mojlighet att redigera. Andra till:
- Lagra artikelraderna i ett eget state (`xmlArticleRows`) som initieras fran `parsedXml.rows`
- Visa `<ArticleRowsEditor>` istallet for den statiska listan
- Visa `<InstructionsEditor>` (med den nya lagg-till-funktionen) istallet for den enkla instruktionslistan
- Anvand `xmlArticleRows` vid submit istallet for `parsedXml.rows`

### Filer som andras

1. **`src/components/InstructionsEditor.tsx`** -- Lagg till "Lagg till instruktion"-funktionalitet med inline-formuler
2. **`src/pages/CreateOrder.tsx`** -- Ersatt statiska listor med redigerbara komponenter for bade artikelrader och instruktioner i XML-floden

### Teknisk detalj

**InstructionsEditor.tsx:**
```typescript
// Nytt state for att lagga till
const [isAdding, setIsAdding] = useState(false);
const [newText, setNewText] = useState('');

const handleAdd = () => {
  if (!newText.trim()) return;
  onInstructionsChange([...instructions, {
    id: crypto.randomUUID(),
    text: newText.trim(),
    rowNumber: String(instructions.length + 1),
  }]);
  setNewText('');
  setIsAdding(false);
};
```

Ta aven bort den tidiga returen for tom lista sa att "Lagg till"-knappen alltid syns.

**CreateOrder.tsx:**
- Nytt state: `const [xmlArticleRows, setXmlArticleRows] = useState<ArticleRow[]>([]);`
- Initieras i `handleFileUpload`: `setXmlArticleRows(parsed.rows);`
- Ersatt `<ul>` med `<ArticleRowsEditor rows={xmlArticleRows} onRowsChange={setXmlArticleRows} />`
- Ersatt inline instruktionslistan med `<InstructionsEditor instructions={xmlInstructions} onInstructionsChange={setXmlInstructions} />`
- I `handleXmlSubmit`: anvand `xmlArticleRows` istallet for `parsedXml.rows`

