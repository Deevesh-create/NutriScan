// Lets `npm run check` import app files that use extensionless relative imports ('./calories'),
// which Metro allows but plain Node doesn't: on a failed lookup, retry with '.ts' added.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith('.') && !/\\.[cm]?[jt]s$/.test(specifier)) return next(specifier + '.ts', context);
    throw error;
  }
}`),
);
