
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

const WeatherSchema = z.object({
    wind: z.string().describe("Wind conditions, e.g., '10 knots from SW'."),
    waves: z.string().describe("Wave conditions, e.g., '1-2 foot swells'."),
    visibility: z.string().describe("Visibility, e.g., 'Clear, 10+ nautical miles'.")
});

const RouteSchema = z.object({
    pickup: CoordinatesSchema.nullable(),
    destination: CoordinatesSchema.nullable(),
});

const FirstMateOutputSchema = z.object({
  weather: WeatherSchema.describe("A realistic marine weather forecast for the area."),
  advice: z.string().describe("Concise, helpful navigation advice for the captain based on the route and weather. Mention any potential hazards or points of interest."),
  route: RouteSchema.optional().describe("The latitude and longitude for the pickup and destination locations.")
});
export type FirstMateOutput = z.infer<typeof FirstMateOutputSchema>;

// Tool to get location coordinates from the database
const getLocationCoordinates = ai.defineTool(
    {
        name: 'getLocationCoordinates',
        description: 'Retrieves the latitude and longitude for a given location name from the database. Returns null if not found.',
        inputSchema: z.object({ locationName: z.string() }),
        outputSchema: CoordinatesSchema.nullable(),
    },
    async ({ locationName }) => {
        console.log(`Searching for location: ${locationName}`);
        try {
            const client = await clientPromise;
            const db = client.db();
            // Use a case-insensitive regex for a more flexible search
            const location = await db.collection('locations').findOne({ name: { $regex: new RegExp(`^${locationName}$`, 'i') } });
            
            if (!location) {
                console.error(`Location not found in DB: ${locationName}`);
                return null;
            }
            
            console.log(`Found location: ${location.name} at ${location.lat}, ${location.lng}`);
            return { lat: location.lat, lng: location.lng };
        } catch (error) {
            console.error(`Error fetching location from DB for "${locationName}":`, error);
            // Return null to allow the flow to continue gracefully
            return null;
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
            console.error("CRITICAL: OpenWeatherMap API key is not configured in environment variables.");
            // Return a specific structure that signals unavailability
            return { description: "Weather data unavailable due to missing API key.", windSpeed: 0, windDeg: 0, visibility: 0 };
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                 const errorData = await response.json();
                 console.error(`Failed to fetch weather data from OpenWeatherMap. Status: ${response.status}. Message: ${errorData.message}`);
                 // Pass back a clear indicator of failure
                 return { description: "Weather data unavailable.", windSpeed: 0, windDeg: 0, visibility: 0 };
            }
            const data = await response.json();
            return {
                description: data.weather[0]?.description || 'N/A',
                windSpeed: data.wind?.speed || 0,
                windDeg: data.wind?.deg || 0,
                visibility: data.visibility || 10000
            };
        } catch (error) {
            console.error("Error fetching weather data from OpenWeatherMap:", error);
            return { description: "Weather data unavailable due to a network or server error.", windSpeed: 0, windDeg: 0, visibility: 0 };
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
    1.  Use the 'getLocationCoordinates' tool to find the latitude and longitude for BOTH the pickup and the destination.
    2.  Populate the 'route' field in the output with the coordinates for both pickup and destination. If a location's coordinates are not found, its value in the 'route' field should be null.
    3.  If destination coordinates are available, use the 'getRealTimeWeather' tool with the *destination's* coordinates to get the live weather. If coordinates are not available, or if the weather service is unavailable, note that in your advice and weather fields.
    4.  Based on the live weather data, formulate a marine-specific forecast. Convert wind speed (m/s) to knots (1 m/s ≈ 1.94 knots). Convert wind direction from degrees to a cardinal direction (e.g., 270 degrees is 'from W'). Create a plausible wave height based on wind speed (e.g., high wind speed means larger waves, no wind means calm). Format visibility in nautical miles (1 meter ≈ 0.00054 nautical miles). If weather is unavailable, state this clearly in the weather fields.
    5.  Provide brief, actionable navigation advice based on the route and the weather. If coordinates are missing for a location, state that clearly in your advice (e.g., "Could not find coordinates for pickup location"). Keep it under 50 words.
    6.  Return all the required data in the specified JSON format.

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
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const { output } = await briefingPrompt(input);
                if (output) {
                    console.log("Successfully generated briefing.");
                    return output;
                }
                console.warn(`Attempt ${attempts}: AI output was null. Retrying...`);
            } catch (error) {
                console.error(`Attempt ${attempts} failed with error:`, error);
                if (attempts >= maxAttempts) {
                    throw new Error("The AI First Mate failed to generate a valid briefing after multiple attempts.");
                }
            }
        }
        // This part should not be reachable, but as a fallback:
        throw new Error("The AI First Mate failed to generate a briefing. The model returned a null or invalid output.");
    }
);

// Main exported flow function
export async function getFirstMateBriefing(input: FirstMateInput): Promise<FirstMateOutput> {
    return briefingFlow(input);
}
