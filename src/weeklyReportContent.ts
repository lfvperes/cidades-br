export interface CityStats {
  total: number;
  published: number;
}

export interface WeeklyReportPlan {
  text: string;
}

/**
 * Builds the text for the weekly progress post, without touching any
 * network or posting API. Pure and deterministic so it can be inspected/
 * tested independently of Bluesky/Twitter credentials.
 */
export function buildWeeklyReportPlan(stats: CityStats): WeeklyReportPlan {
  const percentage = stats.total > 0 ? (stats.published / stats.total) * 100 : 0;
  const formattedPercentage = percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  const text = `📊 Progresso semanal\n${stats.published.toLocaleString('pt-BR')} de ${stats.total.toLocaleString('pt-BR')} cidades brasileiras já foram publicadas (${formattedPercentage}%)\n#Brasil #CidadesDoBrasil`;

  return { text };
}

/**
 * Prints the weekly report plan to the console, without posting anything.
 */
export function printWeeklyReportPlan(plan: WeeklyReportPlan): void {
  console.log('--- Weekly report post ---');
  console.log(plan.text);
}
