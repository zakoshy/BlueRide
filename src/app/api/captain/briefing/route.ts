
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
                'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            console.error(`Webhook error: ${response.status} ${response.statusText}`, responseData);
            const message = responseData?.message || `The AI agent returned an error: ${response.statusText}`;
            return NextResponse.json({ message }, { status: response.status });
        }

        // Assuming the response is the array with the single object containing the output
        if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
            return NextResponse.json({ output: responseData[0].output }, { status: 200 });
        } else {
             // Handle cases where the format is unexpected
             console.error("Unexpected response format from webhook:", responseData);
             return NextResponse.json({ message: 'Received an unexpected response format from the AI agent.' }, { status: 500 });
        }
        
    } catch (error) {
        console.error('Error calling captain briefing webhook:', error);
        return NextResponse.json({ message: 'An internal error occurred while contacting the AI agent.' }, { status: 500 });
    }
}
