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

// dotenv.config();

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
  })
  
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
  // await findPlace();
  // // Create a Bluesky Agent
  // const agent = new BskyAgent({
  //   service: 'https://bsky.social',
  // })

  // await agent.login({
  //   identifier: process.env.BLUESKY_USERNAME!,
  //   password: process.env.BLUESKY_PASSWORD!
  // })
    // console.log(`Logged in as ${agent.session?.handle}`);
  
  const CITIES_API_ENDPOINT = 'http://127.0.0.1:8000/cidades/?state_code=35&used=true';
  try {
  console.log('Fetching cities...');
    const response = await fetch(CITIES_API_ENDPOINT, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const cities = await response.json();
    console.log(cities);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
    // await agent.post(
    //     await createVideoPost(textPath, videoPath, agent)
    // );

    // const recordObj = await agent.post({
    //     text: `testing ${new Date().toLocaleTimeString()}`
    // })

    // console.log("Just posted!")
    // console.log(recordObj)
    
    // await agent.post(makeReplyContent(recordObj, textPath))
    // await agent.post({
    //     text: 'reply ok',
    //     reply: {
    //         root: recordObj,
    //         parent: recordObj
    //     }
    // })

    // console.log("Just replied!")    
}

main();
