import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Fetches data for a city and generates a map and photos, all in one efficient process.
 * @param cityName The name of the city to process.
 * @returns A promise that resolves to an array of file paths for the generated assets.
 */
export async function processCity(cityName: string): Promise<string[]> {
  var filePaths: string[] = [''];
  try {
    console.log(`Starting all operations for city: ${cityName}`);
    
    const cityData = await fetchCityData(cityName);

    if (!cityData) {
      console.log(`Process halted because no data was found for ${cityName}.`);
      return [''];
    }

    // Run asset generation in parallel and collect the file paths.
    const results = await Promise.all([
      generateMapImage(cityData),
      downloadPhotos(cityData)
    ]);

    filePaths = results.flat(); // Flatten the array of arrays
    console.log(`\nSuccessfully generated assets: ${filePaths.join(', ')}`);
    

  } catch (error) {
    console.error(`\nAn error occurred during the processing of ${cityName}:`, error);
  }
  return filePaths;
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
 * @returns The path to the saved map image, or null if it failed.
 */
async function generateMapImage(place: any): Promise<string> {
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
  
  if (mapResponse.ok) {
    const imagePath = path.join(__dirname, "..", "assets", "map.png");
    const imageBuffer = Buffer.from(await mapResponse.arrayBuffer());
    await fs.promises.writeFile(imagePath, imageBuffer);
    console.log(` -> Map image saved to ${imagePath}`);
    return imagePath; // Return the path
  } else {
    console.error(` -> Failed to fetch map image: ${mapResponse.status}`);
    return '';
  }
}

/**
 * Downloads and saves photos from pre-fetched photo data.
 * @returns An array of paths to the downloaded photos.
 */
async function downloadPhotos(place: any): Promise<string[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const savedImagePaths: string[] = [];
  
  if (!place.photos || place.photos.length === 0) {
    console.log(`-> No photos to download for '${place.formattedAddress}'.`);
    return savedImagePaths;
  }

  console.log(`-> Downloading photos for '${place.formattedAddress}'...`);
  // Limit to 3 photos to make room for the map (total 4 images)
  const photoNames = place.photos.map((p: any) => p.name).slice(0, 3);

  for (const [index, name] of photoNames.entries()) {
    const urlPhoto = `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxHeightPx=1000&maxWidthPx=1000`;
    const responsePhoto = await fetch(urlPhoto);

    if (responsePhoto.ok) {
      const imagePath = path.join(__dirname, "..", "assets", `photo_${index + 1}.png`);
      const imageBuffer = Buffer.from(await responsePhoto.arrayBuffer());
      await fs.promises.writeFile(imagePath, imageBuffer);
      console.log(` -> Photo saved to ${imagePath}`);
      savedImagePaths.push(imagePath); // Add successful path to the array
    } else {
      console.error(` -> Failed to fetch photo ${name}: ${responsePhoto.status}`);
    }
  }
  return savedImagePaths;
}