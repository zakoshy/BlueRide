
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const ORS_API_KEY = process.env.OPENROUTERSERVICE_API_KEY;
    if (!ORS_API_KEY) {
        return NextResponse.json({ message: 'ORS API key not configured on server' }, { status: 500 });
    }

    try {
        const { start, end } = await request.json();
        
        if (!start || !end) {
            return NextResponse.json({ message: 'Missing start or end coordinates' }, { status: 400 });
        }

        const orsResponse = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
            method: 'POST',
            headers: {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates: [start, end],
            }),
        });

        const data = await orsResponse.json();

        if (!orsResponse.ok) {
            const errorMessage = data.error?.message || 'An error occurred with OpenRouteService';
            return NextResponse.json({ message: errorMessage }, { status: orsResponse.status });
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error('ORS Proxy Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
