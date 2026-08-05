import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { routes } from './app.routes';

Chart.register(ChartDataLabels);

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding()), provideCharts(withDefaultRegisterables())],
};
