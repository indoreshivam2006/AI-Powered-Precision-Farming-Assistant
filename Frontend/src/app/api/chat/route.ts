// Proxy to the Python FastAPI backend
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, userLocation } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid or empty messages payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || typeof lastMessage.content !== "string") {
    return new Response(JSON.stringify({ error: "Invalid message format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let queryText = lastMessage.content;
  if (userLocation) {
    queryText += `\n\n(Context: My current location is ${userLocation})`;
  }

  // Extract history (excluding the current/last message) and clean it up for the backend
  const history = messages.slice(0, -1).map((m: any) => ({
    role: m.role,
    content: m.content || "",
  }));

  try {
    const advisoryUrl = process.env.ADVISORY_API_URL || "http://127.0.0.1:8080";
    const response = await fetch(`${advisoryUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: queryText,
        image: lastMessage.image || undefined,
        history: history,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    // We return a simple text response. The client-side stream parser
    // will read this as a single chunk and display it beautifully.
    return new Response(data.response, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error("FastAPI Backend Error:", error);
    return new Response(
      "I'm sorry, my core advisory system is currently offline. Please ensure the Python backend is running on port 8080.", 
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }
    );
  }
}
