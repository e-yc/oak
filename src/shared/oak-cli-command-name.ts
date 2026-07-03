export function getOakCliCommandNameForPlatform(platform: NodeJS.Platform): string {
  if (platform === 'linux') {
    return 'oak-ide'
  }
  if (platform === 'win32') {
    return 'oak.cmd'
  }
  return 'oak'
}
