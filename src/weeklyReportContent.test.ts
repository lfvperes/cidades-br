import { buildWeeklyReportPlan } from './weeklyReportContent';

describe('buildWeeklyReportPlan', () => {
  it('formats the count and percentage of published cities', () => {
    const plan = buildWeeklyReportPlan({ total: 5570, published: 1114 });

    expect(plan.text).toBe(
      '📊 Progresso semanal\n1.114 de 5.570 cidades brasileiras já foram publicadas (20%)\n#Brasil #CidadesDoBrasil'
    );
  });

  it('rounds the percentage to one decimal place', () => {
    const plan = buildWeeklyReportPlan({ total: 3, published: 1 });

    expect(plan.text).toContain('(33,3%)');
  });

  it('handles zero total cities without dividing by zero', () => {
    const plan = buildWeeklyReportPlan({ total: 0, published: 0 });

    expect(plan.text).toContain('0 de 0 cidades brasileiras já foram publicadas (0%)');
  });
});
