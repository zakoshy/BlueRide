
import { NextResponse } from 'next/server';

// In a real app, you would protect this route and validate the captain's session.
export async function POST(request: Request) {
    const n8nWebhookUrl = process.env.N8N_CAPTAIN_BRIEFING_WEBHOOK_URL;
    const n8nUser = process.env.N8N_BASIC_AUTH_USER;
    const n8nPass = process.env.N8N_BASIC_AUTH_PASSWORD;

    if (!n8nWebhookUrl || !n8nUser || !n8nPass) {
        console.error("n8n webhook credentials are not configured on the server.");
        return NextResponse.json({ message: "AI agent endpoint is not configured." }, { status: 500 });
    }

    try {
        const body = await request.json();

        // Basic Auth Header using btoa for cross-environment compatibility
        const credentials = btoa(`${n8nUser}:${n8nPass}`);

        const n8nResponse = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`
            },
            body: JSON.stringify(body),
        });

        const responseText = await n8nResponse.text();

        if (!n8nResponse.ok) {
            console.error(`n8n webhook error (${n8nResponse.status}):`, responseText);
            return new Response( `The AI agent returned an error: ${responseText}`, { status: n8nResponse.status });
        }
        
        return new Response(responseText, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            },
        });

    } catch (error: any) {
        console.error("Error contacting AI agent:", error);
        return new Response('An internal error occurred while contacting the AI agent.', { status: 500 });
    }
}
