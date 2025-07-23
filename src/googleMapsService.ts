import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config();

// This is the main function you will export and call from your application.
/**
 * Fetches data for a city and generates a map and photos, all in one efficient process.
 * @param cityName The name of the city to process.
 */
export async function processCity(cityName: string) {
  try {
    console.log(`Starting all operations for city: ${cityName}`);
    
    // Step 1: Fetch all required data in a single API call.
    const cityData = await fetchCityData(cityName);

    if (!cityData) {
      console.log(`Process halted because no data was found for ${cityName}.`);
      return;
    }

    // Step 2: Run the asset generation tasks in parallel for efficiency.
    const [mapPath, imagePaths] = await Promise.all([
      generateMapImage(cityData),
      downloadPhotos(cityData)
    ]);
    const assets = imagePaths?.push(mapPath);
    
    console.log(`\nSuccessfully generated all assets for ${cityName}.`);
    
    return assets;
  } catch (error) {
    console.error(`\nAn error occurred during the processing of ${cityName}:`, error);
    return []
  }
}

// --- Internal "Worker" Functions ---

/**
 * Fetches all necessary data (location, photos, address) in a single API call.
 * This function is not exported, as it's a helper for `processCity`.
 */
async function fetchCityData(cityName: string): Promise<any | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not set.");

  const PLACES_API_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
  const fields = ['location', 'formattedAddress', 'photos'];
  const fieldMask = fields.map(field => `places.${field}`).join(',');

  const response = await fetch(PLACES_API_ENDPOINT, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask 
      },
    body: JSON.stringify({ 
      textQuery: cityName, 
      includedType: 'locality',
      languageCode: 'pt-BR' 
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Google Places API request failed with status ${response.status}: ${errorDetails}`);
  }

  const data = await response.json();
  if (!data.places || data.places.length === 0) return null;
  
  return data.places[0];
}

/**
 * Generates and saves a static map image from pre-fetched location data.
 * This function is not exported, as it's a helper for `processCity`.
 */
async function generateMapImage(place: any) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const { latitude: lat, longitude: lng } = place.location;
  
  console.log(`-> Generating map for '${place.formattedAddress}'...`);

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "12",
    size: "800x450",
    markers: `color:red|label:C|${lat},${lng}`,
    key: apiKey,
  });
  params.append('style', 'feature:poi|visibility:off');

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  const mapResponse = await fetch(mapUrl);
  
  const imagePath = path.join(__dirname,"..", "assets","map.png");
  if (mapResponse.ok) {
    const imageBuffer = Buffer.from(await mapResponse.arrayBuffer());
    await fs.promises.writeFile(imagePath, imageBuffer);
    console.log(` -> Map image saved to ${imagePath}`);
  } else {
    console.error(` -> Failed to fetch map image: ${mapResponse.status}`);
  }
  return imagePath;
}

/**
 * Downloads and saves photos from pre-fetched photo data.
 * This function is not exported, as it's a helper for `processCity`.
 */
async function downloadPhotos(place: any) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  
  if (!place.photos || place.photos.length === 0) {
    console.log(`-> No photos to download for '${place.formattedAddress}'.`);
    return;
  }

  console.log(`-> Downloading photos for '${place.formattedAddress}'...`);
  const photoNames = place.photos.map((p: any) => p.name).slice(0, 4);

  const imagePaths = [];
  for (const [index, name] of photoNames.entries()) {
    const urlPhoto = `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxHeightPx=1000&maxWidthPx=1000`;
    const responsePhoto = await fetch(urlPhoto);

    if (responsePhoto.ok) {
      const imagePath = path.join(__dirname, '..', "assets", `photo_${index + 1}.png`);
      imagePaths.push(imagePath);
      const imageBuffer = Buffer.from(await responsePhoto.arrayBuffer());
      await fs.promises.writeFile(imagePath, imageBuffer);
      console.log(` -> Photo saved to ${imagePath}`);
    } else {
      console.error(` -> Failed to fetch photo ${name}: ${responsePhoto.status}`);
    }
  }
  return imagePaths
}