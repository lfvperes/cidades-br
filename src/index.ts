import { Client, PlaceInputType } from "@googlemaps/google-maps-services-js";
import "dotenv/config";
import { AtpAgent, RichText } from '@atproto/api';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';
import { processCity } from './googleMapsService';
import { mediaSkeet, simpleReplySkeet } from './bsky';
import { mediaTweet } from './xitter';

// dotenv.config();

// Create a Bluesky Agent 
const agent = new AtpAgent({
    service: 'https://bsky.social',
});
const client = new Client({});

const textPath = path.join(__dirname, '../assets', 'text.txt');
const videoPath = path.join(__dirname, '../assets','video.mp4');

async function main() {
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME!, 
        password: process.env.BLUESKY_PASSWORD!
    })
    console.log(`Logged in as ${agent.session?.handle}`);
  
  // --- Fetch Random City ---
  const CITIES_API_ENDPOINT = process.env.CITIES_API_ENDPOINT!;
  var randomCity: any;
  try {
    console.log('Fetching a random city...');
    const response = await fetch(CITIES_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "update_used": true })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    randomCity = await response.json();
    console.log(`City found: ${randomCity.name}`);
  } catch (error) {
    console.error('Error fetching city data:', error);
    return; // Exit if we can't get a city
  }

  // --- Generate Map and Photo Assets ---
  const assetPaths = await processCity(`${randomCity.name} ${randomCity.state}`);

  if (assetPaths.length === 0) {
    console.log("No assets were generated. Aborting post.");
    return;
  }

  // --- Create the Post ---
  const textContent = `📍 ${randomCity.name}, ${randomCity.state}\nPopulação: ${randomCity.est_pop} ${randomCity.gentilic}s\n\n#Brasil`;
  const replyContent = "Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API.";
  const altTexts = assetPaths.map((_, i) =>
    i === 0
      ? `Mapa de ${randomCity.name}, ${randomCity.state}`
      : `Foto de ${randomCity.name}, ${randomCity.state}`
  );
  
  // --- Post to Bluesky ---
  const skeet = await mediaSkeet(agent, assetPaths, altTexts, textContent)  
  console.log(`Post successful!\n${textContent}\n`);
  // --- Post a Reply ---
  await simpleReplySkeet(agent, skeet, replyContent);
  console.log(`Reply successful!\n${replyContent}`);
  
  // --- Post to Twitter ---
  const tweet = await mediaTweet(assetPaths, textContent);
  console.log(`Tweet successful!\n${textContent}`);
  await 
}

main();
