import { Client } from "@googlemaps/google-maps-services-js";
import "dotenv/config";
import { AtpAgent } from '@atproto/api';
import * as process from 'process';
import { processCity } from './googleMapsService';
import { fetchCityWikipediaData } from './wikipediaService';
import { mediaSkeet, simpleReplySkeet, mediaReplySkeet } from './bsky';
import { buildPostPlan, printPostPlan } from './postContent';

// Create a Bluesky Agent
const agent = new AtpAgent({
    service: 'https://bsky.social',
});

// create a Google Maps Client
const client = new Client({});

const isDryRun = process.argv.includes('--dry-run');

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : null;
}

const manualCityName = getArgValue('--city');
const manualState = getArgValue('--state');

async function main() {
  if (manualCityName && !manualState) {
    console.error('--city requires --state to also be set.');
    return;
  }

  if (isDryRun) {
    console.log('Running in --dry-run mode: nothing will be posted, and the city will not be marked as used.\n');
  } else {
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME!,
        password: process.env.BLUESKY_PASSWORD!
    })
    console.log(`Logged in as ${agent.session?.handle}`);
  }

  var randomCity: any;
  const CITIES_API_ENDPOINT = process.env.CITIES_API_ENDPOINT!;
  if (manualCityName) {
    // The base /cidades/ list endpoint (as opposed to /cidades/random/)
    // supports filtering by exact name/state and is read-only (GET), so it's
    // safe to look up a specific city without touching its "used" flag.
    const CITIES_LIST_ENDPOINT = CITIES_API_ENDPOINT.replace(/random\/?$/, '');
    try {
      console.log(`Looking up city: ${manualCityName}, ${manualState}`);
      const params = new URLSearchParams({ name: manualCityName!, state: manualState! });
      const response = await fetch(`${CITIES_LIST_ENDPOINT}?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const results = await response.json();
      if (!results || results.length === 0) {
        console.error(`No city found matching "${manualCityName}, ${manualState}".`);
        return;
      }
      randomCity = results[0];
      console.log(`City found: ${randomCity.name}`);
    } catch (error) {
      console.error('Error looking up city data:', error);
      return;
    }
  } else {
    // --- Fetch Random City ---
    try {
      console.log('Fetching a random city...');
      const response = await fetch(CITIES_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "update_used": !isDryRun })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      randomCity = await response.json();
      console.log(`City found: ${randomCity.name}`);
    } catch (error) {
      console.error('Error fetching city data:', error);
      return; // Exit if we can't get a city
    }
  }

  // --- Generate Map/Photo Assets and Wikipedia Data in parallel ---
  const [assetPaths, wikiData] = await Promise.all([
    processCity(`${randomCity.name} ${randomCity.state}`),
    fetchCityWikipediaData(randomCity.name, randomCity.state)
  ]);

  if (assetPaths.length === 0) {
    console.log("No assets were generated. Aborting post.");
    return;
  }

  // --- Build post content ---
  const plan = buildPostPlan(randomCity, assetPaths, wikiData);
  const {
    mainText: textContent,
    mainAltTexts: altTexts,
    wikiTexts,
    wikiImagePaths,
    wikiAltTexts,
    creditsText: creditsContent,
  } = plan;

  if (isDryRun) {
    printPostPlan(plan);
    return;
  }

  // --- Post to Bluesky ---
  const skeet = await mediaSkeet(agent, assetPaths, altTexts, textContent)
  console.log(`Post successful on Bluesky!\n${textContent}\n`);

  // --- Post Wikipedia Reply(ies) (if available), split across posts if too long ---
  let lastBskyPost = skeet;
  for (let i = 0; i < wikiTexts.length; i++) {
    const images = i === 0 ? wikiImagePaths : [];
    const alts = i === 0 ? wikiAltTexts : [];
    lastBskyPost = await mediaReplySkeet(agent, skeet, lastBskyPost, images, alts, wikiTexts[i]);
    console.log(`Wikipedia reply ${i + 1}/${wikiTexts.length} successful on Bluesky!\n${wikiTexts[i]}`);
  }

  // --- Post Credits Reply ---
  await simpleReplySkeet(agent, skeet, lastBskyPost, creditsContent);
  console.log(`Reply successful on Bluesky!\n${creditsContent}`);
}

main();
