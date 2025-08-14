
'use server';
/**
 * @fileOverview An AI First Mate to assist boat captains.
 *
 * - getFirstMateBriefing - A function that provides a pre-trip briefing.
 * - FirstMateInput - The input type for the briefing function.
 * - FirstMateOutput - The return type for the briefing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import clientPromise from '@/lib/mongodb';


// Input Schema
const FirstMateInputSchema = z.object({
  pickup: z.string().describe('The name of the pickup location.'),
  destination: z.string().describe('The name of the destination location.'),
});
export type FirstMateInput = z.infer<typeof FirstMateInputSchema>;

// Output Schema
const CoordinatesSchema = z.object({
    lat: z.number().describe("Latitude of the location."),
    lng: z.number().describe("Longitude of the location.")
});

const RouteSchema = z.object({
    pickup: CoordinatesSchema,
    destination: CoordinatesSchema
});

const WeatherSchema = z.object({
    wind: z.string().describe("Wind conditions, e.g., '10 knots from SW'."),
    waves: z.string().describe("Wave conditions, e.g., '1-2 foot swells'."),
    visibility: z.string().describe("Visibility, e.g., 'Clear, 10+ nautical miles'.")
});

const FirstMateOutputSchema = z.object({
  route: RouteSchema.describe("The latitude and longitude for the trip's start and end points."),
  weather: WeatherSchema.describe("A realistic marine weather forecast for the area."),
  advice: z.string().describe("Concise, helpful navigation advice for the captain based on the route and weather. Mention any potential hazards or points of interest.")
});
export type FirstMateOutput = z.infer<typeof FirstMateOutputSchema>;

// Tool to get location coordinates from the database
const getLocationCoordinates = ai.defineTool(
    {
        name: 'getLocationCoordinates',
        description: 'Retrieves the latitude and longitude for a given location name from the database.',
        inputSchema: z.object({ locationName: z.string() }),
        outputSchema: CoordinatesSchema,
    },
    async ({ locationName }) => {
        try {
            const client = await clientPromise;
            const db = client.db();
            const location = await db.collection('locations').findOne({ name: { $regex: new RegExp(`^${locationName}$`, 'i') } });
            if (!location) {
                // Let's try a more flexible search if exact match fails
                 const flexibleLocation = await db.collection('locations').findOne({ name: { $regex: new RegExp(locationName, 'i') } });
                 if(!flexibleLocation) {
                    throw new Error(`Location not found: ${locationName}`);
                 }
                 return { lat: flexibleLocation.lat, lng: flexibleLocation.lng };
            }
            return { lat: location.lat, lng: location.lng };
        } catch (error) {
            console.error("Error fetching location from DB:", error);
            throw new Error(`Failed to retrieve location data for ${locationName}.`);
        }
    }
);

// Tool to get real-time weather from OpenWeatherMap
const getRealTimeWeather = ai.defineTool(
    {
        name: 'getRealTimeWeather',
        description: 'Retrieves the real-time weather forecast for a given latitude and longitude.',
        inputSchema: CoordinatesSchema,
        outputSchema: z.object({
            description: z.string(),
            windSpeed: z.number().describe("Wind speed in meters/sec"),
            windDeg: z.number().describe("Wind direction in degrees"),
            visibility: z.number().describe("Visibility in meters"),
        })
    },
    async ({ lat, lng }) => {
        const apiKey = process.env.OPENWEATHERMAP_API_KEY;
        if (!apiKey) {
            console.warn("OpenWeatherMap API key is not configured.");
            // Return default/unavailable data instead of throwing an error
            return { description: "Weather data unavailable", windSpeed: 0, windDeg: 0, visibility: 10000 };
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                 const errorBody = await response.text();
                console.error(`Failed to fetch weather data. Status: ${response.status}. Body: ${errorBody}`);
                // Return default/unavailable data on API error
                return { description: "Weather data unavailable", windSpeed: 0, windDeg: 0, visibility: 10000 };
            }
            const data = await response.json();
            return {
                description: data.weather[0]?.description || 'N/A',
                windSpeed: data.wind?.speed || 0,
                windDeg: data.wind?.deg || 0,
                visibility: data.visibility || 10000
            };
        } catch (error) {
            console.error("Error fetching weather data:", error);
             // Return default/unavailable data on network or other errors
            return { description: "Weather data unavailable", windSpeed: 0, windDeg: 0, visibility: 10000 };
        }
    }
);


// Genkit Prompt
const briefingPrompt = ai.definePrompt({
    name: 'firstMateBriefingPrompt',
    input: { schema: FirstMateInputSchema },
    output: { schema: FirstMateOutputSchema },
    tools: [getLocationCoordinates, getRealTimeWeather],
    prompt: `You are an AI First Mate for a water taxi captain in coastal Kenya. Your job is to provide a concise, professional pre-trip briefing.

    The captain has provided a pickup and destination location.
    1.  Use the 'getLocationCoordinates' tool to find the latitude and longitude for BOTH the pickup and destination points.
    2.  Use the 'getRealTimeWeather' tool with the *destination's* coordinates to get the live weather. If the weather service is unavailable, note that in your advice.
    3.  Based on the live weather data, formulate a marine-specific forecast. Convert wind speed (m/s) to knots (1 m/s ≈ 1.94 knots). Convert wind direction from degrees to a cardinal direction (e.g., 270 degrees is 'from W'). Create a plausible wave height based on wind speed (e.g., high wind speed means larger waves, no wind means calm). Format visibility in nautical miles (1 meter ≈ 0.00054 nautical miles).
    4.  Provide brief, actionable navigation advice based on the route and the weather. Note any potential hazards (like shallow areas, reefs, or heavy traffic zones). Keep it under 50 words.
    5.  Return all the required data in the specified JSON format. Crucially, the 'route' field in your response MUST contain the latitude and longitude for both the pickup and destination points you found in step 1.

    Pickup: {{{pickup}}}
    Destination: {{{destination}}}
    `,
});

const briefingFlow = ai.defineFlow(
    {
        name: 'firstMateBriefingFlow',
        inputSchema: FirstMateInputSchema,
        outputSchema: FirstMateOutputSchema,
    },
    async (input) => {
        const { output } = await briefingPrompt(input);
        if (!output) {
            throw new Error("The AI First Mate failed to generate a briefing. The model returned a null output.");
        }
        return output;
    }
);

// Main exported flow function
export async function getFirstMateBriefing(input: FirstMateInput): Promise<FirstMateOutput> {
    return briefingFlow(input);
}
