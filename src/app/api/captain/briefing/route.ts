
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
            // If n8n gives an error, forward it
            const errorText = await n8nResponse.text();
            console.error(`n8n webhook error (${n8nResponse.status}):`, errorText);
            return new Response( `The AI agent returned an error: ${errorText}`, { status: n8nResponse.status });
        }
        
        // n8n returns the output as plain text in a JSON wrapper
        // We will parse the JSON, extract the text, and send that back
        const responseData = await n8nResponse.json();
        
        // The expected format is an array with one object: [{ "output": "..." }]
        const outputText = responseData?.[0]?.output;

        if (typeof outputText !== 'string') {
             console.error('AI agent response did not contain a valid "output" string.', responseData);
             return new Response('Failed to parse the AI briefing.', { status: 500 });
        }
        
        // Return the plain text response directly to the client
        return new Response(outputText, {
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
