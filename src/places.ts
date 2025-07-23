import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

export async function photosFromCity(cityName: string) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
    if (!apiKey) {
        throw new Error("The GOOGLE_MAPS_API_KEY environment variable is not set.");
    }

    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    // A minimal request body with only the required field.
    const requestBody = {
        textQuery: cityName,
        includedType: 'locality',
        languageCode: 'pt-BR'
    };
    
    // A minimal field mask.
    const fields = ['id', 'formattedAddress', 'photos'];
    const fieldMask = fields.map(field => `places.${field}`).join(',');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fieldMask,
            },
            body: JSON.stringify(requestBody),
        });

        // Read the raw text of the response for better error logging.
        const responseBody = await response.text();

        if (!response.ok) {
            // Log the raw response body which might contain a detailed error.
            console.error("API request failed. Raw response from Google:", responseBody);
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const data = JSON.parse(responseBody);
        const allPhotoNames = data.places.flatMap((place: any) => place.photos.map((photo: any) => photo.name));
        
        const allPhotoUris : string[] = []
        for (let name of allPhotoNames.slice(0, 5)) {
            // Fetch the photo using the name from
            // By removing `skipHttpRedirect=true`, the response body will be the image itself.
            const urlPhoto = `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxHeightPx=1000&maxWidthPx=1000`;
            const responsePhoto = await fetch(urlPhoto, {
                method: 'GET',
                headers: {
                    'X-Goog-Api-Key': apiKey,
                },
            });

            if (!responsePhoto.ok) {
                // Handle potential errors when fetching the image itself
                console.error(`Failed to fetch image for ${name}. Status: ${responsePhoto.status}`);
                continue; // Skip to the next photo
            }

            // The final URL after redirection is the photo's URI.
            const newUri = responsePhoto.url;
            allPhotoUris.push(newUri);

            // Read the body ONCE as an ArrayBuffer.
            const imageArrayBuffer = await responsePhoto.arrayBuffer();
            const imageBuffer = Buffer.from(imageArrayBuffer);
            await fs.promises.writeFile(`img${allPhotoUris.length}.png`, imageBuffer);
        }
        
    } catch (error) {
        // We already logged the important details, so just print the error object.
        console.error("\nFailed to make Places API request:", error);
    }
}

// photosFromCity('Campo Grande mato grosso do sul');