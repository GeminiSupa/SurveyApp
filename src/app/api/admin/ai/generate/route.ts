import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, fileContent } = await request.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured in environment variables." }, { status: 500 });
  }

  const systemPrompt = `
    You are an expert UX Research and Psychology survey designer.
    Your task is to take a raw questionnaire or instructions and convert it into a structured JSON survey study.
    
    The output must be a JSON object with exactly these fields:
    - title: string (title of the study)
    - studyType: "ux_research" | "psychology_study"
    - blocks: Array of blocks where each block is:
      {
        id: string (generate a random uuid),
        blockType: "consent" | "survey" | "multiple_choice" | "ux_task" | "brs",
        label: string (short label for the block),
        config: {
          // for survey (likert): questions: [{ id, question, scaleSize }]
          // for multiple_choice: questions: [{ id, question, options: string[] }]
          // for consent: title, text
          // for ux_task: taskType: "first_click", prompt, imageUrl (leave empty)
        }
      }

    IMPORTANT: Return ONLY the raw JSON object. No markdown, no explanations.
  `;

  const userContent = `
    Instructions/Questionnaire Content:
    ${fileContent || ""}
    
    User Additional Prompt:
    ${prompt || "Create a comprehensive study based on this content."}
  `;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: `Groq API Error: ${err.error?.message || response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Generation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
