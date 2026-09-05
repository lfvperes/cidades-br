import * as fs from 'fs';
import path from 'path';

const WIKIPEDIA_API = 'https://pt.wikipedia.org/w/api.php';
const WIKIPEDIA_REST_API = 'https://pt.wikipedia.org/api/rest_v1/page/summary';
const WIKIDATA_API = 'https://www.wikidata.org/wiki/Special:EntityData';
const COMMONS_FILE_PATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

// Wikimedia's API etiquette policy throttles/blocks requests without a
// descriptive User-Agent, so every request identifies this bot and its repo.
const USER_AGENT = 'CidadesBrBot/1.0 (https://github.com/lfvperes/cidades-br)';
const WIKIMEDIA_HEADERS = { 'User-Agent': USER_AGENT };

export interface CityWikipediaData {
  summary: string | null;
  flagPath: string | null;
}

/**
 * Fetches a city's Wikipedia summary paragraph and flag image (via Wikidata).
 * Fails gracefully: any missing piece (no article, no flag claim, download error)
 * results in that field being null rather than throwing.
 */
export async function fetchCityWikipediaData(cityName: string, state: string): Promise<CityWikipediaData> {
  try {
    const title = await resolveArticleTitle(cityName, state);
    if (!title) {
      console.log(`No Wikipedia article found for ${cityName}, ${state}.`);
      return { summary: null, flagPath: null };
    }

    const [summary, flagPath] = await Promise.all([
      fetchSummary(title),
      fetchFlagImage(title, cityName),
    ]);

    return { summary, flagPath };
  } catch (error) {
    console.error(`Error fetching Wikipedia data for ${cityName}, ${state}:`, error);
    return { summary: null, flagPath: null };
  }
}

async function resolveArticleTitle(cityName: string, state: string): Promise<string | null> {
  // Brazilian municipality articles are almost always titled exactly as the
  // city name, so try that direct/exact lookup first — MediaWiki's search
  // relevance ranking is unreliable and can bury (or fuzzy-match past) the
  // real article, as seen with small towns like "Campestre de Goiás".
  const exactTitle = await fetchExactTitle(cityName);
  if (exactTitle) return exactTitle;

  // Falls back to search for name collisions, where the real article is
  // disambiguated (e.g. "Bom Jesus (Rio Grande do Sul)").
  return searchArticleTitle(cityName, state);
}

async function fetchExactTitle(cityName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    titles: cityName,
    redirects: '1',
    prop: 'pageprops',
    format: 'json',
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params.toString()}`, { headers: WIKIMEDIA_HEADERS });
  if (!response.ok) throw new Error(`Wikipedia titles lookup failed with status ${response.status}`);

  const data = await response.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const page: any = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  // Disambiguation pages (name collisions) need the search fallback instead.
  if (page.pageprops?.disambiguation !== undefined) return null;

  return page.title;
}

async function searchArticleTitle(cityName: string, state: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `${cityName} ${state}`,
    srlimit: '5',
    format: 'json',
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params.toString()}`, { headers: WIKIMEDIA_HEADERS });
  if (!response.ok) throw new Error(`Wikipedia search failed with status ${response.status}`);

  const data = await response.json();
  const results = data?.query?.search;
  if (!results || results.length === 0) return null;

  // MediaWiki's relevance ranking doesn't always put the actual city article
  // first (e.g. an article merely mentioning the city name can outrank it),
  // and falls back to unrelated results entirely when there's no real hit.
  // So scan the top results and only trust one whose title actually starts
  // with the city name (as real/disambiguated articles do).
  const normalizedCityName = normalize(cityName);
  const match = results.find((result: any) => normalize(result.title).startsWith(normalizedCityName));

  return match?.title || null;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

async function fetchSummary(title: string): Promise<string | null> {
  const response = await fetch(`${WIKIPEDIA_REST_API}/${encodeURIComponent(title)}`, { headers: WIKIMEDIA_HEADERS });
  if (!response.ok) {
    console.error(`Failed to fetch Wikipedia summary for "${title}": ${response.status}`);
    return null;
  }

  const data = await response.json();
  return data.extract || null;
}

async function fetchFlagImage(title: string, cityName: string): Promise<string | null> {
  const qid = await fetchWikidataId(title);
  if (!qid) return null;

  const flagFilename = await fetchFlagFilename(qid);
  if (!flagFilename) return null;

  return downloadFlagImage(flagFilename, cityName);
}

async function fetchWikidataId(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    titles: title,
    format: 'json',
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params.toString()}`, { headers: WIKIMEDIA_HEADERS });
  if (!response.ok) throw new Error(`Wikipedia pageprops request failed with status ${response.status}`);

  const data = await response.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const page: any = Object.values(pages)[0];
  return page?.pageprops?.wikibase_item || null;
}

async function fetchFlagFilename(qid: string): Promise<string | null> {
  const response = await fetch(`${WIKIDATA_API}/${qid}.json`, { headers: WIKIMEDIA_HEADERS });
  if (!response.ok) throw new Error(`Wikidata entity request failed with status ${response.status}`);

  const data = await response.json();
  const claims = data?.entities?.[qid]?.claims;
  const flagClaim = claims?.P41?.[0]?.mainsnak?.datavalue?.value;
  return flagClaim || null;
}

async function downloadFlagImage(filename: string, cityName: string): Promise<string | null> {
  const encodedFilename = encodeURIComponent(filename.replace(/ /g, '_'));
  const flagUrl = `${COMMONS_FILE_PATH}/${encodedFilename}?width=800`;

  console.log(`-> Downloading flag for '${cityName}'...`);
  const response = await fetch(flagUrl, { headers: WIKIMEDIA_HEADERS });
  if (!response.ok) {
    console.error(`Failed to fetch flag image "${filename}": ${response.status}`);
    return null;
  }

  const imagePath = path.join(__dirname, '..', 'assets', 'flag.png');
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(imagePath, imageBuffer);
  console.log(` -> Flag image saved to ${imagePath}`);
  return imagePath;
}
