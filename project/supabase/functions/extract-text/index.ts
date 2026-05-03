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
    const openaiApiKey = formData.get("openaiApiKey") as string;

    if (!file || !openaiApiKey) {
      throw new Error("Missing file or API key");
    }

    const fileType = file.type;
    const arrayBuffer = await file.arrayBuffer();

    let extractedText = "";

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

    return new Response(
      JSON.stringify({ text: extractedText }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error extracting text:", error);
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
              text: "Extraia todo o texto visível desta imagem. Retorne apenas o texto extraído.",
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
  if (data.error) {
    throw new Error(`OpenAI Error: ${data.error.message}`);
  }

  return data.choices[0].message.content;
}
