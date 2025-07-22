import * as dotenv from 'dotenv';

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
        for (let name of allPhotoNames) {
            // const name = allPhotoNames[0]
            // Fetch the photo using the name from
            const urlPhoto = `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxHeightPx=1000&maxWidthPx=1000&skipHttpRedirect=true`;
            const responsePhoto = await fetch(urlPhoto, {
                method: 'GET',
                headers: {
                    'X-Goog-Api-Key': apiKey,
                },
            });
            const responseBodyPhoto = await responsePhoto.text();
            const newUri = JSON.parse(responseBodyPhoto).photoUri;
            allPhotoUris.push(newUri);
        }
        console.log(allPhotoUris);
        
    } catch (error) {
        // We already logged the important details, so just print the error object.
        console.error("\nFailed to make Places API request:", error);
    }
}

// photosFromCity('Campo Grande mato grosso do sul');