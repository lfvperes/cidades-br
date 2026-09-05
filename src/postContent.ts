import { chunkText } from './textUtils';

// Leaves room for a "(x/y) " numbering prefix on multi-part paragraphs,
// and stays under Twitter's 280-char cap since the same text posts to both platforms.
const WIKI_CHUNK_LIMIT = 260;

export interface CityData {
  name: string;
  state: string;
  est_pop: number;
  gentilic: string;
}

export interface WikiData {
  summary: string | null;
  flagPath: string | null;
}

export interface PostPlan {
  mainText: string;
  mainAltTexts: string[];
  wikiTexts: string[];
  wikiImagePaths: string[];
  wikiAltTexts: string[];
  creditsText: string;
}

/**
 * Builds every piece of text/media that will be posted for a city, without
 * touching any network or posting API. Pure and deterministic so it can be
 * inspected/tested independently of Bluesky/Twitter credentials.
 */
export function buildPostPlan(city: CityData, assetPaths: string[], wikiData: WikiData): PostPlan {
  const mainText = `📍 ${city.name}, ${city.state}\nPopulação: ${city.est_pop.toLocaleString('pt-BR')} ${city.gentilic}s\n#${city.state.replaceAll(' ', '')} #Brasil`;

  const mainAltTexts = assetPaths.map((_, i) =>
    i === 0
      ? `Mapa de ${city.name}, ${city.state}`
      : `Foto de ${city.name}, ${city.state}`
  );

  const wikiChunks = wikiData.summary ? chunkText(wikiData.summary, WIKI_CHUNK_LIMIT) : [];
  const wikiTexts = wikiChunks.map((chunk, i) =>
    wikiChunks.length > 1 ? `(${i + 1}/${wikiChunks.length}) ${chunk}` : chunk
  );

  let creditsText = "Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API.";
  if (wikiTexts.length > 0) {
    creditsText += wikiData.flagPath ? " Texto e bandeira obtidos da Wikipedia." : " Texto obtido da Wikipedia.";
  }

  const wikiImagePaths = wikiData.flagPath ? [wikiData.flagPath] : [];
  const wikiAltTexts = wikiData.flagPath ? [`Bandeira de ${city.name}`] : [];

  return { mainText, mainAltTexts, wikiTexts, wikiImagePaths, wikiAltTexts, creditsText };
}

/**
 * Prints every piece of a PostPlan to the console, in the order it would be
 * posted, without posting anything.
 */
export function printPostPlan(plan: PostPlan): void {
  console.log('--- Main post ---');
  console.log(plan.mainText);
  console.log('Alt texts:', plan.mainAltTexts);

  if (plan.wikiTexts.length === 0) {
    console.log('\n(no Wikipedia reply)');
  } else {
    plan.wikiTexts.forEach((text, i) => {
      console.log(`\n--- Wikipedia reply ${i + 1}/${plan.wikiTexts.length} (${text.length} chars) ---`);
      console.log(text);
      if (i === 0 && plan.wikiImagePaths.length > 0) {
        console.log('Image:', plan.wikiImagePaths, 'Alt:', plan.wikiAltTexts);
      }
    });
  }

  console.log('\n--- Credits reply ---');
  console.log(plan.creditsText);
}
