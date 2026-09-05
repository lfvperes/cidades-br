import { buildPostPlan, CityData, WikiData } from './postContent';

const city: CityData = {
  name: 'Ouro Preto',
  state: 'Minas Gerais',
  est_pop: 74558,
  gentilic: 'ouropretano',
};

const assetPaths = ['/assets/map.png', '/assets/photo_1.png', '/assets/photo_2.png'];

function printPlan(label: string, plan: ReturnType<typeof buildPostPlan>) {
  console.log(`\n========== ${label} ==========`);
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
  console.log('='.repeat(20 + label.length + 22));
}

describe('buildPostPlan', () => {
  it('shows the full content for a city with a short summary and a flag', () => {
    const wikiData: WikiData = {
      summary: 'Ouro Preto é um município histórico do estado de Minas Gerais, conhecido por sua arquitetura colonial.',
      flagPath: '/assets/flag.png',
    };

    const plan = buildPostPlan(city, assetPaths, wikiData);
    printPlan('Short summary + flag', plan);

    expect(plan.mainText).toBe(
      '📍 Ouro Preto, Minas Gerais\nPopulação: 74.558 ouropretanos\n#MinasGerais #Brasil'
    );
    expect(plan.mainAltTexts).toEqual([
      'Mapa de Ouro Preto, Minas Gerais',
      'Foto de Ouro Preto, Minas Gerais',
      'Foto de Ouro Preto, Minas Gerais',
    ]);
    expect(plan.wikiTexts).toEqual([wikiData.summary]);
    expect(plan.wikiImagePaths).toEqual(['/assets/flag.png']);
    expect(plan.wikiAltTexts).toEqual(['Bandeira de Ouro Preto']);
    expect(plan.creditsText).toBe(
      'Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API. Texto e bandeira obtidos da Wikipedia.'
    );
  });

  it('shows the full content for a city with a long summary split into numbered replies', () => {
    const paragraph = Array(10).fill(
      'Esta é uma frase razoavelmente longa sobre a história e a cultura da cidade.'
    ).join(' ');

    const wikiData: WikiData = { summary: paragraph, flagPath: '/assets/flag.png' };
    const plan = buildPostPlan(city, assetPaths, wikiData);
    printPlan('Long summary split across replies', plan);

    expect(plan.wikiTexts.length).toBeGreaterThan(1);
    plan.wikiTexts.forEach(text => expect(text.length).toBeLessThanOrEqual(280));
    plan.wikiTexts.forEach((text, i) =>
      expect(text.startsWith(`(${i + 1}/${plan.wikiTexts.length}) `)).toBe(true)
    );

    // Reassembling the numbered chunks reproduces the original paragraph.
    const reassembled = plan.wikiTexts.map(t => t.replace(/^\(\d+\/\d+\) /, '')).join(' ');
    expect(reassembled).toBe(paragraph);
  });

  it('shows the full content when there is a summary but no flag', () => {
    const wikiData: WikiData = { summary: 'Um resumo qualquer sem bandeira associada no Wikidata.', flagPath: null };
    const plan = buildPostPlan(city, assetPaths, wikiData);
    printPlan('Summary without flag', plan);

    expect(plan.wikiImagePaths).toEqual([]);
    expect(plan.wikiAltTexts).toEqual([]);
    expect(plan.creditsText).toContain('Texto obtido da Wikipedia.');
    expect(plan.creditsText).not.toContain('bandeira');
  });

  it('shows the full content when no Wikipedia data is available at all', () => {
    const wikiData: WikiData = { summary: null, flagPath: null };
    const plan = buildPostPlan(city, assetPaths, wikiData);
    printPlan('No Wikipedia data', plan);

    expect(plan.wikiTexts).toEqual([]);
    expect(plan.wikiImagePaths).toEqual([]);
    expect(plan.creditsText).toBe(
      'Dados obtidos do IBGE. Fotos obtidas do Google Places API e mapas obtidos do Google Maps Static API.'
    );
  });
});
