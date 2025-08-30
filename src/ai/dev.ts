import { config } from 'dotenv';
import path from 'path';

// Load the .env.local file from the project root for Genkit scripts
config({ path: path.resolve(process.cwd(), '.env.local') });
