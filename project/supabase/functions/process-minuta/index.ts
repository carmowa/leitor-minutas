import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const outputName = formData.get("outputName") as string;
    const template = formData.get("template") as string;
    const userId = formData.get("userId") as string;
    const customInstructions = formData.get("customInstructions") as string || "";

    if (!file || !outputName || !template || !userId) {
      throw new Error("Missing required fields");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}&select=openai_api_key`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const settings = await settingsResponse.json();
    if (!settings || settings.length === 0 || !settings[0].openai_api_key) {
      throw new Error("OpenAI API Key not found");
    }

    const openaiApiKey = settings[0].openai_api_key;

    let extractedText = "";
    const fileType = file.type;
    const arrayBuffer = await file.arrayBuffer();

    if (fileType === "application/pdf") {
      extractedText = await extractPDF(arrayBuffer);
    } else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extractedText = await extractDOCX(arrayBuffer);
    } else if (
      fileType === "image/png" ||
      fileType === "image/jpeg" ||
      fileType === "image/jpg"
    ) {
      extractedText = await extractImage(arrayBuffer, openaiApiKey);
    } else {
      throw new Error("Unsupported file type");
    }

    const { content, minutaFields } = await processWithOpenAI(
      extractedText,
      template,
      openaiApiKey,
      customInstructions
    );

    const docxBuffer = await generateDOCX(content, outputName);

    try {
      await fetch(`${supabaseUrl}/rest/v1/documents`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          original_filename: file.name,
          output_filename: `${outputName}.docx`,
          status: "completed",
        }),
      });
    } catch (e) {
      console.error("Error saving document record:", e);
    }

    return new Response(docxBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outputName}.docx"`,
        "X-Minuta-Fields": JSON.stringify(minutaFields),
      },
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function extractPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
  const data = await pdfParse(Buffer.from(arrayBuffer));
  return data.text;
}

async function extractDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("npm:mammoth@1.6.0");
  const result = await mammoth.extractRawText({
    arrayBuffer: arrayBuffer,
  });
  return result.value;
}

async function extractImage(
  arrayBuffer: ArrayBuffer,
  openaiApiKey: string
): Promise<string> {
  const base64Image = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extraia todo o texto visível desta imagem. Retorne apenas o texto extraído, sem comentários adicionais.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function processWithOpenAI(
  content: string,
  template: string,
  apiKey: string,
  customInstructions: string
): Promise<{ content: string; minutaFields: Array<{ label: string; value: string; confidence: number }> }> {
  const systemPrompt = `Você é um especialista em redação jurídica e administrativa.

Com base no conteúdo abaixo, reescreva e organize as informações no formato de uma minuta padrão seguindo exatamente a estrutura fornecida.

Conteúdo extraído:
${content}

Modelo de minuta:
${template}

${customInstructions ? `Instruções específicas do usuário:\n${customInstructions}\n` : ''}

Regras:
- Manter linguagem formal e profissional
- Não inventar dados que não estejam no conteúdo
- Preencher o máximo possível com base no conteúdo extraído
- Se faltar informação, deixar campos claros como [PREENCHER]
- Estruturar exatamente como o modelo fornecido
- Retornar APENAS o texto da minuta, sem comentários ou explicações adicionais

IMPORTANTE: Após gerar a minuta, analise cada campo/seção da minuta e estime um score de confiabilidade (0-100%) baseado em:
- Clareza e completude dos dados
- Se os dados fazem sentido contextualmente
- Se há indicadores de falta de informação

Retorne o resultado em JSON com esta estrutura:
{
  "minutaContent": "texto da minuta aqui",
  "confidenceScores": [
    {"label": "Nome do Campo", "value": "valor do campo", "confidence": 95, "reason": "motivo da confiança"},
    ...
  ]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Processe a certidão e gere a minuta com análise de confiabilidade.",
        },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`OpenAI Error: ${data.error.message}`);
  }

  let result;
  try {
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = {
        minutaContent: data.choices[0].message.content,
        confidenceScores: [],
      };
    }
  } catch {
    result = {
      minutaContent: data.choices[0].message.content,
      confidenceScores: [],
    };
  }

  return {
    content: result.minutaContent || data.choices[0].message.content,
    minutaFields: result.confidenceScores || [],
  };
}

async function generateDOCX(
  content: string,
  filename: string
): Promise<ArrayBuffer> {
  const { Document, Packer, Paragraph, TextRun } = await import(
    "npm:docx@8.5.0"
  );

  const paragraphs = content.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line || " ")],
        spacing: {
          after: 200,
        },
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
