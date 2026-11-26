import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const resolveExtensionlessTs = (specifier, context, nextResolve) => {
  if (!specifier.startsWith('.') || /\.[cm]?[jt]sx?$/.test(specifier)) return nextResolve(specifier, context);
  const candidate = new URL(`${specifier}.ts`, context.parentURL);
  if (!existsSync(fileURLToPath(candidate))) return nextResolve(specifier, context);
  return nextResolve(`${specifier}.ts`, context);
};

registerHooks({ resolve: resolveExtensionlessTs });
