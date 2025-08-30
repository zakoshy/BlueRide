
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

        if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text();
            console.error(`n8n webhook error (${n8nResponse.status}):`, errorText);
            return new Response( `The AI agent returned an error: ${errorText}`, { status: n8nResponse.status });
        }
        
        // n8n can sometimes return a JSON array with the output, or just the text
        // To handle both, we'll try to parse it, and fall back to plain text
        const responseText = await n8nResponse.text();
        try {
            const jsonData = JSON.parse(responseText);
            // If it's the expected array format, extract the output
            if (Array.isArray(jsonData) && jsonData[0] && jsonData[0].output) {
                return new Response(jsonData[0].output, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' },
                });
            }
        } catch (e) {
            // It's not JSON, so it's likely the plain text output directly
            // Do nothing and fall through to return the raw text
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
