import { config } from 'dotenv';
import path from 'path';

// Load the .env file from the project root
config({ path: path.resolve(process.cwd(), '.env') });
