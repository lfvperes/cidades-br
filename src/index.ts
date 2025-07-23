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
  
  const CITIES_API_ENDPOINT = 'http://127.0.0.1:8000/cidades/random/';
  var randomCity;
  try {
  console.log('Fetching cities...');
    const response = await fetch(CITIES_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({"update_used": false})
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    randomCity = await response.json();
    console.log(randomCity);

  } catch (error) {
    console.error('Error fetching data:', error);
  }

  console.log(randomCity.name)
  const assets = await processCity(`${randomCity.name} ${randomCity.state}`);
  console.log(assets);

  console.log(`📍 ${randomCity.name}, ${randomCity.state}\nPopulação: ${randomCity.est_pop} ${randomCity.gentilic}s`);
  console.log("Reply: Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API.")
  // const recordObj = await agent.post({
  //     text: `${randomCity.name}, ${randomCity.state}\nPopulação: ${randomCity.est_pop} ${randomCity.gentilic}`
  // })

  console.log("Just posted!")
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
