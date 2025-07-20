import { Client, PlaceType1 } from "@googlemaps/google-maps-services-js";
import "dotenv/config";
import * as process from 'process';
import * as fs from "fs";

const client = new Client({});

async function getMapForCity(cityName: string) {
  try {
    // Step 1: Search for the city to get its coordinates
    const textSearchRequest = {
      params: {
        query: cityName,
        // By casting the string 'locality', we tell TypeScript to trust us
        // that this value is acceptable, fixing the compile-time error.
        type: 'locality' as unknown as PlaceType1,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    };

    const searchResponse = await client.textSearch(textSearchRequest);
    const results = searchResponse.data.results;

    if (results && results.length > 0 && results[0].geometry) {
      const location = results[0].geometry.location;
      const { lat, lng } = location;
      console.log(`Found city '${results[0].name}' at ${lat},${lng}`);

      // Step 2: Construct the Static Map API URL from a parameters object
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_MAPS_API_KEY is not set in the .env file");
      }
      
      const params = {
        center: `${lat},${lng}`,
        zoom: "12",
        size: "800x450",
        style: "feature:poi|visibility:off",
        markers: `color:red|label:C|${lat},${lng}`,
        key: apiKey,
      };

      // URLSearchParams will correctly encode all parameters for the URL
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${new URLSearchParams(params).toString()}`;
      console.log("Fetching map from URL...");

      // Step 3: Fetch the image and save it using a buffer
      const mapResponse = await fetch(mapUrl);

      if (mapResponse.ok) {
        const imagePath = "map.png";
        const imageArrayBuffer = await mapResponse.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);
        await fs.promises.writeFile(imagePath, imageBuffer);
        console.log(`Map image saved to ${imagePath}`);
      } else {
        console.error("Failed to fetch map image:", mapResponse.status, mapResponse.statusText);
        const errorText = await mapResponse.text();
        console.error("Error details:", errorText);
      }

    } else {
      console.log(`No results found for city: ${cityName}`);
    }
  } catch (error) {
    console.error(error);
  }
}

// Example: Get a map for a specific city
// getMapForCity("barbosa sp Brazil");
// getMapForCity("sao carlos sp Brazil");
getMapForCity("sao bernardo do campo sp Brazil");
