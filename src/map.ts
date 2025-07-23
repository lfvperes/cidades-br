import * as fs from "fs";
import * as dotenv from 'dotenv';

dotenv.config();

export async function getMapForCity(cityName: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  if (!apiKey) {
      throw new Error("The GOOGLE_MAPS_API_KEY environment variable is not set.");
  }
  // Step 1: Use fetch to call the Google Places API directly
  const PLACES_API_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
  
  // A minimal request body with only the required field.
  const requestBody = {
      textQuery: cityName,
      includedType: 'locality',
      languageCode: 'pt-BR'
  };

  // A minimal field mask.
  const fields = ['id', 'formattedAddress', 'photos', 'location'];
  const fieldMask = fields.map(field => `places.${field}`).join(',');
  try {
    const apiResponse = await fetch(PLACES_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!apiResponse.ok) {
      const errorDetails = await apiResponse.text();
      throw new Error(`Places API request failed with status ${apiResponse.status}: ${errorDetails}`);
    }

    const searchResponse = await apiResponse.json();
    if (!apiResponse.ok) {      
            console.error("API request failed. Raw response from Google:", searchResponse);
            throw new Error(`HTTP error! status: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const results = searchResponse.places[0];
    // The location object from a direct API call is nested under 'location'
    const lat = results.location.latitude;
    const lng = results.location.longitude;
    
    console.log(`Found city '${results.formattedAddress}' at ${lat},${lng}`);

    // Step 2: Construct the Static Map API URL from a parameters object.
    // This part remains the same as it already uses fetch.
    
      
      const params = new URLSearchParams({
        center: `${lat},${lng}`,
        zoom: "12",
        size: "800x450",
        markers: `color:red|label:C|${lat},${lng}`,
        key: apiKey,
      });
      params.append('style', 'feature:poi|visibility:off');
      params.append('style','feature:political.neighborhood|element:labels|visibility:off');
      params.append('style','feature:administrative.neighborhood|element:labels|visibility:off');

      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

      console.log("Fetching map from URL...");

      // Step 3: Fetch the image and save it using a buffer.
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

  } catch (error) {
    console.error(error);
  }
}

// Example: Get a map for a specific city.
// getMapForCity("Belo Horizonte mg");
// getMapForCity("sao carlos sp");
// getMapForCity("sao carlos sc");