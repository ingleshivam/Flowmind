import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PYTHON_BACKEND}/api/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail ?? "Execution failed");
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Forward the full response including RAG metadata
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isConnRefused =
      message.includes("ECONNREFUSED") || message.includes("fetch failed");
    return NextResponse.json(
      {
        error: isConnRefused
          ? "Cannot connect to Python backend. Make sure it is running: cd backend && python main.py"
          : `Proxy error: ${message}`,
      },
      { status: 502 }
    );
  }
}
