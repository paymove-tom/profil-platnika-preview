/* Punkt wejścia aplikacji (ES module, bez buildu).
   Kolejność importów ekranów = kolejność rejestracji tras = kolejność w panelu Stany. */
import { start } from './core/index.js';
import './screens/auth.js';
import './screens/portfel.js';
import './screens/dane.js';
import './screens/historia.js';
import './screens/boty.js';
import './screens/limity.js';
import './screens/zakupy.js';

start();
