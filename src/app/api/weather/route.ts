
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const OWM_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
    if (!OWM_API_KEY) {
        return NextResponse.json({ message: 'OpenWeatherMap API key not configured on server' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ message: 'Missing latitude or longitude parameters' }, { status: 400 });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
             const errorMessage = data.message || 'An error occurred with OpenWeatherMap';
            return NextResponse.json({ message: errorMessage }, { status: response.status });
        }
        
        const weatherData = {
            condition: data.weather[0]?.main || 'N/A',
            icon: data.weather[0]?.icon || '01d',
            temp: data.main?.temp,
            wind: data.wind?.speed,
        };

        return NextResponse.json(weatherData, { status: 200 });

    } catch (error) {
        console.error('Weather API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
