
'use server';

import { FirstMateInput, getFirstMateBriefing, FirstMateOutput } from "@/ai/flows/first-mate-flow";

// This is just a re-export to make the flow available to the client component.
// In the future, you could add more business logic here if needed.
export async function getAIBriefing(input: FirstMateInput): Promise<FirstMateOutput> {
  return getFirstMateBriefing(input);
}
