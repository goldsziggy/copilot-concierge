// This example is opt-in: copy its directory to .github/extensions/ only after review.
import { defineWorkflow, joinSession } from '@github/copilot-sdk/extension';
import { meta, runPilot } from './workflow.mjs';

const pilot = defineWorkflow({ meta, run: runPilot });
await joinSession({ workflows: [pilot] });
