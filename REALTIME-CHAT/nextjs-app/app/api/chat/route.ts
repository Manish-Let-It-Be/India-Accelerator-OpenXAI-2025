import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const maxRetries = 3; // number of times to retry if model is still loading
    const retryDelay = 2000; // 2 seconds between retries

    let data: any;
    let attempt = 0;

    while (attempt < maxRetries) {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt: message,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Ollama');
      }

      data = await response.json();
      console.log('Ollama raw response:', JSON.stringify(data, null, 2));

      const modelMessage = data.response?.trim();

      if (modelMessage) {
        // Success: model returned text
        return NextResponse.json({ message: modelMessage });
      }

      if (data.done_reason !== 'load') {
        // Model didn’t return text, but it’s not loading either
        return NextResponse.json(
          { error: 'Model did not generate a response.' },
          { status: 500 }
        );
      }

      // Model is still loading, wait and retry
      await new Promise(res => setTimeout(res, retryDelay));
      attempt++;
    }

    // If we reach here, model never became ready
    return NextResponse.json(
      { error: 'Model is still loading. Please try again in a few seconds.' },
      { status: 503 }
    );

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
