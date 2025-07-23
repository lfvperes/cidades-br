import { BskyAgent } from '@atproto/api';
import { Client, PlaceInputType } from "@googlemaps/google-maps-services-js";
import "dotenv/config";
import * as process from 'process';
import * as path from 'path';
import readFileToString from './readFile';
import * as fs from 'fs';
import createVideoPost from './embedVideo';
import makeReplyContent from './makeReply';
import { url } from 'inspector';
import { photosFromCity } from './places';
import { getMapForCity } from './map';
import { processCity } from './googleMapsService';

// dotenv.config();

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
});
const client = new Client({});

const textPath = path.join(__dirname, '../assets', 'text.txt');
const videoPath = path.join(__dirname, '../assets','video.mp4');

async function findPlace() {
  try {
    const request = {
      params: {
        input: "Museum of Contemporary Art Australia",
        inputtype: PlaceInputType.textQuery,
        fields: ["name", "geometry"],
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    };

    const response = await client.findPlaceFromText(request);
    console.log(response.data.candidates);
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  // Create a Bluesky Agent
  const agent = new BskyAgent({
    service: 'https://bsky.social',
  })

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
      body: JSON.stringify({ "update_used": false })
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

  // // --- Upload Images in Parallel ---
  console.log("Uploading images to Bluesky...");
  const uploadPromises = assetPaths.map(p => agent.com.atproto.repo.uploadBlob(fs.readFileSync(p)));
  const uploadResults = await Promise.all(uploadPromises);

  // --- Create the Post ---
  const textContent = `📍 ${randomCity.name}, ${randomCity.state}\nPopulação: ${randomCity.est_pop} ${randomCity.gentilic}s`;
  const replyContent = "Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API.";
  
  const recordObj = await agent.post({
    text: textContent,
    langs: ["pt-BR"],
    embed: {
      $type: "app.bsky.embed.images",
      images: uploadResults.map(res => ({
        alt: `Imagem de ${randomCity.name}, ${randomCity.state}`, // Add descriptive alt text
        image: res.data.blob,
      }))
    }
  });
  
  console.log(`Post successful!\n${textContent}\n`);
  console.log("View post at:", `https://bsky.app/profile/${agent.session?.handle}/post/${recordObj.uri.split('/').pop()}`);
  
  // // --- Post a Reply ---
  await agent.post({
    text: replyContent,
    reply: {
      root: recordObj,
      parent: recordObj
    }
  });
  
  console.log(`Reply successful!\n${replyContent}`);
}
main();
