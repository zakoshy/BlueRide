
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { lat, long, destination } = await request.json();

    if (lat === undefined || long === undefined || !destination) {
        return NextResponse.json({ message: 'Missing required fields: lat, long, destination' }, { status: 400 });
    }

    const webhookUrl = 'https://zackoshy.app.n8n.cloud/webhook/captainfeedback';
    const username = 'zack';
    const password = 'edwin123';

    // The webhook expects an array with a single object
    const payload = [{ lat, long, destination }];

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Use btoa for universal base64 encoding, instead of Node.js Buffer
                'Authorization': `Basic ${btoa(`${username}:${password}`)}`
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            console.error(`Webhook error: ${response.status} ${response.statusText}`, responseData);
            const message = responseData?.message || `The AI agent returned an error: ${response.statusText}`;
            return NextResponse.json({ message }, { status: response.status });
        }

        // Directly forward the response from the webhook
        return NextResponse.json(responseData, { status: 200 });
        
    } catch (error) {
        console.error('Error calling captain briefing webhook:', error);
        return NextResponse.json({ message: 'An internal error occurred while contacting the AI agent.' }, { status: 500 });
    }
}
