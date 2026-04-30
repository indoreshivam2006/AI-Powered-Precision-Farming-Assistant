// Proxy to the Python FastAPI backend
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, userLocation } = await req.json();
  const lastMessage = messages[messages.length - 1];

  let queryText = lastMessage.content;
  if (userLocation) {
    queryText += `\n\n(Context: My current location is ${userLocation})`;
  }

  try {
    const response = await fetch("http://127.0.0.1:8080/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query: queryText,
        image: lastMessage.image || undefined,
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
