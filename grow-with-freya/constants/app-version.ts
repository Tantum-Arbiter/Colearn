export function versionLabel(version: string, build: string | null): string {
  return build ? `${version} (${build})` : version;
}
