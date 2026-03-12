import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "No PDF data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du är en expert på att extrahera orderdata från svenska PDF-dokument (inköpsordrar, förfrågningar, orderbekräftelser).

Extrahera följande fält från PDF-texten och returnera som JSON. Använd tool calling för att returnera resultatet.

Regler:
- orderNumber: Ordernummer, förfrågannummer eller liknande identifierare
- customer: Köparen/kunden (företagsnamnet som skickar ordern)
- customerReference: Referensperson hos kunden (t.ex. "Vår referens" eller kontaktperson)
- deliveryAddress: Leveransadress (om angiven)
- orderDate: Orderdatum i format YYYY-MM-DD (om angivet)
- deliveryDate: Leveransdatum i format YYYY-MM-DD (om angivet)
- rows: Artikelrader från tabellen. Varje rad ska ha:
  - rowNumber: Positionsnummer (t.ex. "10", "20")
  - partNumber: Artikelnummer
  - text: Benämning/beskrivning av artikeln. Inkludera även eventuella instruktioner/behandlingar som hör till raden (t.ex. "Blästrad, sprutförzinkad..." osv.)
  - quantity: Antal (numeriskt)
  - unit: Enhet (t.ex. "ST", "st", "st.")
  - price: À-pris (numeriskt, 0 om ej angivet)
- instructions: Övergripande instruktioner som INTE hör till en specifik artikelrad (t.ex. generella behandlingsinstruktioner, packningsinstruktioner). Varje instruktion har:
  - text: Instruktionstexten
  - rowNumber: Löpnummer (t.ex. "I1", "I2")

Om ett fält saknas, returnera tom sträng eller tom array.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Extrahera orderdata från denna PDF:\n\n${pdfBase64}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_order",
                description: "Return structured order data extracted from the PDF",
                parameters: {
                  type: "object",
                  properties: {
                    orderNumber: { type: "string" },
                    customer: { type: "string" },
                    customerReference: { type: "string" },
                    deliveryAddress: { type: "string" },
                    orderDate: { type: "string" },
                    deliveryDate: { type: "string" },
                    rows: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          rowNumber: { type: "string" },
                          partNumber: { type: "string" },
                          text: { type: "string" },
                          quantity: { type: "number" },
                          unit: { type: "string" },
                          price: { type: "number" },
                        },
                        required: ["rowNumber", "partNumber", "text", "quantity", "unit", "price"],
                        additionalProperties: false,
                      },
                    },
                    instructions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: { type: "string" },
                          rowNumber: { type: "string" },
                        },
                        required: ["text", "rowNumber"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "orderNumber",
                    "customer",
                    "customerReference",
                    "deliveryAddress",
                    "orderDate",
                    "deliveryDate",
                    "rows",
                    "instructions",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_order" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter saknas. Kontakta administratör." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI returned no structured data");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Add IDs to rows and instructions
    const rows = (extracted.rows || []).map((row: any, i: number) => ({
      id: crypto.randomUUID(),
      rowNumber: row.rowNumber || String((i + 1) * 10),
      partNumber: row.partNumber || "",
      text: row.text || "",
      quantity: Number(row.quantity) || 0,
      unit: row.unit || "st",
      price: Number(row.price) || 0,
    }));

    const instructions = (extracted.instructions || []).map((inst: any, i: number) => ({
      id: crypto.randomUUID(),
      text: inst.text || "",
      rowNumber: inst.rowNumber || `I${i + 1}`,
    }));

    const result = {
      orderNumber: extracted.orderNumber || "",
      customer: extracted.customer || "",
      customerReference: extracted.customerReference || "",
      deliveryAddress: extracted.deliveryAddress || "",
      orderDate: extracted.orderDate || "",
      deliveryDate: extracted.deliveryDate || "",
      rows,
      instructions,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-pdf-order error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Okänt fel vid PDF-tolkning",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
