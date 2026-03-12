

## PDF-import av ordrar

Lägger till stöd för att importera ordrar från PDF-filer (förfrågningar och inköpsordrar) bredvid den befintliga XML-importen. Eftersom PDF-format varierar mycket mellan leverantörer används AI för att extrahera orderdata.

### Upplägg

**Fliken "Importera fil"** — den nuvarande XML-fliken utökas till att acceptera både `.xml` och `.pdf`. Vid PDF-uppladdning skickas filinnehållet till en backend-funktion som använder AI för att tolka texten och returnera strukturerad orderdata i samma format som XML-parsern.

### Ändringar

| Fil | Ändring |
|-----|---------|
| `supabase/functions/parse-pdf-order/index.ts` | Ny backend-funktion: tar emot PDF som base64, extraherar text med pdf-parse, skickar till AI-modell (Gemini 2.5 Flash) med prompt att returnera JSON med orderNumber, customer, customerReference, deliveryAddress, orderDate, deliveryDate, artikelrader och instruktioner. Returnerar samma struktur som `ParsedXMLOrder`. |
| `src/pages/CreateOrder.tsx` | Byt namn på XML-fliken till "Importera fil". Acceptera `.xml` och `.pdf`. Vid PDF: läs filen som base64, anropa edge function, mappa svaret till `ParsedXMLOrder` och visa samma förhandsgransknings-/redigeringsvy som idag. |
| `src/pages/CreateOrder.tsx` | Uppdatera drop-zone och fil-input att acceptera `.pdf` utöver `.xml`. Visa laddningsindikator under AI-tolkning. |

### AI-prompten (i edge function)

Modellen får instruktionen att extrahera exakt dessa fält från PDF-texten:
- `orderNumber` — ordernummer/förfrågannummer
- `customer` — köpare/kund
- `customerReference` — referensperson
- `deliveryAddress` — leveransadress
- `orderDate`, `deliveryDate`
- `rows[]` — artikelrader med `rowNumber`, `partNumber`, `text`, `quantity`, `unit`, `price`
- `instructions[]` — instruktioner/behandlingsbeskrivningar

Svaret returneras som JSON och mappas direkt till `ParsedXMLOrder`.

### Användarflöde

1. Användaren väljer "Importera fil"-fliken
2. Drar och släpper en PDF (eller XML som förut)
3. Vid PDF: kort laddning medan AI tolkar
4. Samma förhandsgranskningsvy visas — användaren kan redigera/lägga till enheter innan skapande

