import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-loader-hooks.mjs', pathToFileURL(import.meta.filename));
