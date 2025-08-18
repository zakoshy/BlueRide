
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
            // Use a case-insensitive regex for a more flexible search, matching if the name contains the location.
            const location = await db.collection('locations').findOne({ name: { $regex: locationName, $options: 'i' } });
            
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

// Genkit Prompt
const briefingPrompt = ai.definePrompt({
    name: 'firstMateBriefingPrompt',
    input: { schema: FirstMateInputSchema },
    output: { schema: FirstMateOutputSchema },
    tools: [getLocationCoordinates],
    prompt: `You are an AI First Mate for a water taxi captain in coastal Kenya. Your job is to provide a concise, professional pre-trip briefing.

    The captain has provided a pickup and destination location.
    1.  Use the 'getLocationCoordinates' tool to find the latitude and longitude for BOTH the pickup and the destination.
    2.  Populate the 'route' field in the output with the coordinates for both pickup and destination. If a location's coordinates are not found, its value in the 'route' field should be null.
    3.  Generate a plausible, realistic-sounding marine weather forecast for coastal Kenya (wind, waves, visibility). Do NOT use any tools for this. Make it sound authentic for the region.
    4.  Provide brief, actionable navigation advice based on the route and the plausible weather you generated. If coordinates are missing for a location, state that clearly in your advice (e.g., "Could not find coordinates for pickup location"). Keep it under 50 words.
    5.  Return all the required data in the specified JSON format.

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
