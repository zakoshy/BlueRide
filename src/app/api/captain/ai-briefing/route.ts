
import { NextResponse } from 'next/server';

// This is a protected route. In a real app, you'd validate the captain's session.

export async function POST(request: Request) {
    // These credentials should be in environment variables in a real app
    const webhookUrl = 'https://zackoshy.app.n8n.cloud/webhook/captainfeedback';
    const username = 'zack';
    const password = 'edwin123';

    try {
        const { lat, long, destination } = await request.json();

        if (lat === undefined || long === undefined || !destination) {
            return NextResponse.json({ message: 'Missing required payload: lat, long, destination' }, { status: 400 });
        }

        const payload = { lat, long, destination };

        // Encode credentials for Basic Authentication using Buffer for server-side compatibility
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');

        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await webhookResponse.json();

        if (!webhookResponse.ok) {
            console.error("Webhook API Error:", data);
            // Forward the error message from the webhook if available
            const errorMessage = data.message || 'The AI agent failed to provide a briefing.';
            return NextResponse.json({ message: errorMessage }, { status: webhookResponse.status });
        }

        // Forward the successful response from the webhook back to the client
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error('AI Briefing Proxy Error:', error);
        return NextResponse.json({ message: 'An internal error occurred while contacting the AI agent.' }, { status: 500 });
    }
}
