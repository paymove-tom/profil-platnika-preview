/* Punkt wejścia rdzenia: ładuje moduły w kolejności zależności (rejestrują PM.*).
   Ekrany i main.js importują wyłącznie stąd: import { PM } from '../core/index.js'. */
import './env.js';
import { PM } from './pm.js';
import './util.js';
import './state.js';
import './timers.js';
import './behaviors.js';
import './components.js';
import './shell.js';
import './overlay.js';
import './events.js';
import { start } from './router.js';

export { PM, start };
