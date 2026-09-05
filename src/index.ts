import { Client } from "@googlemaps/google-maps-services-js";
import "dotenv/config";
import { AtpAgent } from '@atproto/api';
import * as process from 'process';
import { processCity } from './googleMapsService';
import { fetchCityWikipediaData } from './wikipediaService';
import { mediaSkeet, simpleReplySkeet, mediaReplySkeet } from './bsky';
import { mediaTweet, mediaReplyTweet } from './xitter';
import { chunkText } from './textUtils';
import { TwitterApi } from "twitter-api-v2";

// Create a Bluesky Agent 
const agent = new AtpAgent({
    service: 'https://bsky.social',
});
// Create a X Client
const xClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!
});
const rwxClient = xClient.readWrite;

// create a Google Maps Client
const client = new Client({});

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

  // --- Generate Map/Photo Assets and Wikipedia Data in parallel ---
  const [assetPaths, wikiData] = await Promise.all([
    processCity(`${randomCity.name} ${randomCity.state}`),
    fetchCityWikipediaData(randomCity.name, randomCity.state)
  ]);

  if (assetPaths.length === 0) {
    console.log("No assets were generated. Aborting post.");
    return;
  }

  // --- Create post content ---
  const textContent = `📍 ${randomCity.name}, ${randomCity.state}\nPopulação: ${randomCity.est_pop.toLocaleString('pt-BR')} ${randomCity.gentilic}s\n#${randomCity.state.replaceAll(' ','')} #Brasil`;
  const altTexts = assetPaths.map((_, i) =>
    i === 0
      ? `Mapa de ${randomCity.name}, ${randomCity.state}`
      : `Foto de ${randomCity.name}, ${randomCity.state}`
  );

  // Leaves room for a "(x/y) " numbering prefix on multi-part paragraphs,
  // and stays under Twitter's 280-char cap since the same text posts to both platforms.
  const WIKI_CHUNK_LIMIT = 260;
  const wikiChunks = wikiData.summary ? chunkText(wikiData.summary, WIKI_CHUNK_LIMIT) : [];
  const wikiTexts = wikiChunks.map((chunk, i) =>
    wikiChunks.length > 1 ? `(${i + 1}/${wikiChunks.length}) ${chunk}` : chunk
  );

  let creditsContent = "Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API.";
  if (wikiTexts.length > 0) {
    creditsContent += wikiData.flagPath ? " Texto e bandeira obtidos da Wikipedia." : " Texto obtido da Wikipedia.";
  }

  const wikiImagePaths = wikiData.flagPath ? [wikiData.flagPath] : [];
  const wikiAltTexts = wikiData.flagPath ? [`Bandeira de ${randomCity.name}`] : [];

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

  // --- Post to Twitter ---
  const tweet = await mediaTweet(xClient, rwxClient, assetPaths, textContent);
  console.log(`Tweet successful on Twitter!\n${textContent}`);

  if (tweet) {
    let lastTweetId = tweet.data.id;

    // --- Post Wikipedia Reply(ies) (if available), split across posts if too long ---
    for (let i = 0; i < wikiTexts.length; i++) {
      const images = i === 0 ? wikiImagePaths : [];
      const wikiTweet = await mediaReplyTweet(xClient, rwxClient, images, wikiTexts[i], lastTweetId);
      console.log(`Wikipedia reply ${i + 1}/${wikiTexts.length} successful on Twitter!\n${wikiTexts[i]}`);
      if (wikiTweet) lastTweetId = wikiTweet.data.id;
    }

    // --- Post Credits Reply ---
    await xClient.v2.reply(creditsContent, lastTweetId);
    console.log(`Reply successful on Twitter!\n${creditsContent}`);
  }
}

main();
