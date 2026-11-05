// SPDX-License-Identifier: MIT
// Lets plain Node run the app's modules, which import each other without file extensions (as
// Vite allows): `node --import ./eval/register.mjs eval/run.mjs ...`
import { register } from 'node:module';

register('./resolve-hook.mjs', import.meta.url);
