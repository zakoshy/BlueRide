
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const webhookUrl = 'https://zackoshy.app.n8n.cloud/webhook/captainfeedback';
    const username = 'zack';
    const password = 'edwin123';

    try {
        // Get the raw body from the incoming request
        const body = await request.json();

        // Forward the request directly to the n8n webhook
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(`${username}:${password}`)}`
            },
            // Pass the original body through
            body: JSON.stringify(body),
        });
        
        // Check if the webhook response is successful
        if (!response.ok) {
            // Attempt to get more detailed error info from the webhook's response
            const errorData = await response.json().catch(() => ({ message: `The AI agent returned a non-OK status: ${response.status}` }));
            console.error(`Webhook error: ${response.status} ${response.statusText}`, errorData);
            const message = errorData?.message || `The AI agent returned an error: ${response.statusText}`;
            return NextResponse.json({ message }, { status: response.status });
        }
        
        // Get the JSON response from the webhook
        const responseData = await response.json();

        // Directly forward the successful response from the webhook to the client
        return NextResponse.json(responseData, { status: 200 });
        
    } catch (error) {
        console.error('Error in briefing proxy route:', error);
        return NextResponse.json({ message: 'An internal error occurred while contacting the AI agent.' }, { status: 500 });
    }
}
