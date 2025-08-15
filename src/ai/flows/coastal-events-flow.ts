
'use server';
/**
 * @fileOverview An AI-powered coastal business advisor.
 *
 * - getCoastalBusinessAdvice - A function that provides business insights for boat owners.
 * - CoastalAdviceOutput - The return type for the advice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';

// No input needed for this version, but we can add county/region later.
const CoastalAdviceInputSchema = z.object({});

// Output Schema
const CoastalAdviceOutputSchema = z.object({
  seasonalOutlook: z.string().describe("A brief paragraph (2-3 sentences) on the current seasonal outlook for tourism and travel in coastal Kenya."),
  upcomingEvents: z.array(z.object({
    event: z.string().describe("The name of the event or holiday."),
    date: z.string().describe("The date or date-range of the event."),
    advice: z.string().describe("A short, actionable piece of advice for a boat owner related to this event, e.g., 'Consider offering special packages for...' or 'Expect higher demand on this route...'."),
  })).describe("A list of 2-3 upcoming, relevant events or holidays in the next 1-2 months."),
  strategicRecommendation: z.string().describe("A concluding strategic tip for the boat owner to maximize their business potential.")
});
export type CoastalAdviceOutput = z.infer<typeof CoastalAdviceOutputSchema>;

const briefingPrompt = ai.definePrompt({
    name: 'coastalAdvisorPrompt',
    input: { schema: CoastalAdviceInputSchema },
    output: { schema: CoastalAdviceOutputSchema },
    prompt: `You are an expert business advisor for water taxi operators in coastal Kenya (covering Mombasa, Kilifi, Kwale, Lamu).

    The current date is ${format(new Date(), 'MMMM do, yyyy')}.

    Your task is to provide a concise, actionable business intelligence briefing. The goal is to help a boat owner make smart decisions about their pricing and services in the near future.

    1.  **Seasonal Outlook**: Briefly summarize the current tourism season. Is it high, low, or shoulder season? What trends should they be aware of?
    2.  **Upcoming Events**: Identify 2-3 key upcoming public holidays, local festivals, or notable events in the next 1-2 months that would impact boat travel. For each, provide a short piece of actionable advice.
    3.  **Strategic Recommendation**: Provide one final, insightful tip to help them grow their business.

    Return the information in the specified JSON format. The tone should be professional, encouraging, and helpful.`,
});

const coastalAdviceFlow = ai.defineFlow(
    {
        name: 'coastalAdviceFlow',
        inputSchema: CoastalAdviceInputSchema,
        outputSchema: CoastalAdviceOutputSchema,
    },
    async () => {
        const { output } = await briefingPrompt({});
        if (!output) {
            throw new Error("The AI advisor failed to generate a briefing.");
        }
        return output;
    }
);

export async function getCoastalBusinessAdvice(): Promise<CoastalAdviceOutput> {
    return coastalAdviceFlow();
}
