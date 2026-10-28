// Builds the plugin, packs it for the Jellyfin catalogue and adds the version to manifest.json.
// Usage: node scripts/release.mjs 0.1.0.0 "What changed"
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const PLUGIN = {
  guid: 'd5e09db5-245d-4b8d-a8b5-1e5d48841ba6',
  name: 'Afterglow',
  owner: 'kiketorres98',
  repo: 'kiketorres98/jellyfin-plugin-afterglow',
  category: 'General',
  targetAbi: '12.3.0.0',
  description: 'The extras of the Afterglow theme: quality marks, a side menu, a home billboard, top 10 and a tonight picker.',
  overview: 'Adds small features to the Jellyfin web client that CSS alone cannot do. Needs the File Transformation plugin.',
  imageUrl: 'https://raw.githubusercontent.com/kiketorres98/jellyfin-plugin-afterglow/main/logo.png',
  dll: 'Jellyfin.Plugin.Afterglow.dll',
};

/** The manifest with `entry` added as the newest version (an existing entry with the same version is replaced). */
export function addVersion(manifest, entry) {
  const current = Array.isArray(manifest) ? manifest : [];
  const plugin = current.find((p) => p.guid === PLUGIN.guid) ?? {
    guid: PLUGIN.guid, name: PLUGIN.name, description: PLUGIN.description, overview: PLUGIN.overview,
    owner: PLUGIN.owner, category: PLUGIN.category, imageUrl: PLUGIN.imageUrl, versions: [],
  };
  const versions = [entry, ...plugin.versions.filter((v) => v.version !== entry.version)];
  return [{ ...plugin, versions }, ...current.filter((p) => p.guid !== PLUGIN.guid)];
}

/** The catalogue entry for a packed version. */
export function versionEntry({ version, changelog, checksum, timestamp }) {
  return {
    version,
    changelog,
    targetAbi: PLUGIN.targetAbi,
    sourceUrl: `https://github.com/${PLUGIN.repo}/releases/download/v${version}/afterglow_${version}.zip`,
    checksum,
    timestamp,
  };
}

function zip(folder, target) {
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${folder}/*' -DestinationPath '${target}' -Force`], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-j', '-r', target, folder], { stdio: 'inherit' });
  }
}

function main() {
  const [version, changelog = 'Update'] = process.argv.slice(2);
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Usage: node scripts/release.mjs 1.2.3.4 "changelog"');

  const out = 'out';
  rmSync(out, { recursive: true, force: true });
  const publish = join(out, 'publish');
  const pack = join(out, 'pack');
  mkdirSync(pack, { recursive: true });

  execFileSync('dotnet', [
    'publish', 'Jellyfin.Plugin.Afterglow', '-c', 'Release', '-o', publish,
    `-p:AssemblyVersion=${version}`, `-p:FileVersion=${version}`,
  ], { stdio: 'inherit' });

  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  cpSync(join(publish, PLUGIN.dll), join(pack, PLUGIN.dll));
  writeFileSync(join(pack, 'meta.json'), JSON.stringify({
    category: PLUGIN.category, guid: PLUGIN.guid, name: PLUGIN.name, description: PLUGIN.description,
    overview: PLUGIN.overview, owner: PLUGIN.owner, targetAbi: PLUGIN.targetAbi, timestamp, version,
    status: 'Active', autoUpdate: true, assemblies: [PLUGIN.dll],
  }, null, 2));

  const archive = join(out, `afterglow_${version}.zip`);
  zip(pack, archive);
  const checksum = createHash('md5').update(readFileSync(archive)).digest('hex').toUpperCase();

  const manifestPath = 'manifest.json';
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
  writeFileSync(manifestPath, `${JSON.stringify(addVersion(manifest, versionEntry({ version, changelog, checksum, timestamp })), null, 2)}\n`);
  console.log(`Packed ${archive} (md5 ${checksum}) and updated ${manifestPath}`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('release.mjs')) main();
