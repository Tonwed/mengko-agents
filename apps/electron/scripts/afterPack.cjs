/**
 * electron-builder afterPack hook
 *
 * Copies the pre-compiled macOS 26+ Liquid Glass icon (Assets.car) into the
 * app bundle. The Assets.car file is compiled locally using actool with the
 * macOS 26 SDK (not available in CI), then committed to the repo.
 *
 * Also copies the Claude Agent SDK from monorepo root to the app bundle.
 *
 * To regenerate Assets.car after icon changes:
 *   cd apps/electron
 *   xcrun actool "resources/icon.icon" --compile "resources" \
 *     --app-icon AppIcon --minimum-deployment-target 26.0 \
 *     --platform macosx --output-partial-info-plist /dev/null
 *
 * For older macOS versions, the app falls back to icon.icns which is
 * included separately by electron-builder.
 */

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

module.exports = async function afterPack(context) {
  const appPath = context.appOutDir;
  const platform = context.electronPlatformName;

  // Determine app bundle name based on platform
  const appName = 'Mengko Agents';
  const resourcesDir = platform === 'darwin'
    ? path.join(appPath, `${appName}.app`, 'Contents', 'Resources')
    : path.join(appPath, 'resources');

  console.log(`afterPack: platform=${platform}`);
  console.log(`afterPack: appOutDir=${appPath}`);
  console.log(`afterPack: resourcesDir=${resourcesDir}`);

  // === Copy Claude Agent SDK ===
  const projectDir = context.packager.projectDir;
  const workspaceRoot = path.resolve(projectDir, '..', '..');
  const sdkSource = path.join(workspaceRoot, 'node_modules', '@anthropic-ai', 'claude-agent-sdk');
  const sdkDest = path.join(resourcesDir, 'app', 'node_modules', '@anthropic-ai', 'claude-agent-sdk');

  console.log(`afterPack: workspaceRoot=${workspaceRoot}`);
  console.log(`afterPack: sdkSource=${sdkSource}`);
  console.log(`afterPack: sdkDest=${sdkDest}`);

  if (fs.existsSync(sdkSource)) {
    console.log('Copying Claude Agent SDK...');
    // Create destination directory
    fse.ensureDirSync(path.dirname(sdkDest));

    // Copy SDK, excluding unnecessary ripgrep binaries
    const filter = (src) => {
      const relative = path.relative(sdkSource, src);
      // Skip ripgrep binaries for other platforms
      if (relative.includes('arm64-linux')) return false;
      if (relative.includes('x64-linux')) return false;
      if (platform === 'darwin' && relative.includes('x64-win32')) return false;
      if (platform === 'win32' && relative.includes('x64-darwin')) return false;
      if (platform === 'linux' && relative.includes('x64-win32')) return false;
      return true;
    };

    fse.copySync(sdkSource, sdkDest, { filter });
    console.log('Claude Agent SDK copied successfully');
  } else {
    console.log(`Warning: Claude Agent SDK not found at ${sdkSource}`);
  }

  // === Copy macOS Liquid Glass Icon ===
  if (platform !== 'darwin') {
    console.log('Skipping Liquid Glass icon (not macOS)');
    return;
  }

  const precompiledAssets = path.join(projectDir, 'resources', 'Assets.car');

  console.log(`afterPack: looking for Assets.car at ${precompiledAssets}`);

  // Check if pre-compiled Assets.car exists
  if (!fs.existsSync(precompiledAssets)) {
    console.log('Warning: Pre-compiled Assets.car not found in resources/');
    console.log('The app will use the fallback icon.icns on all macOS versions');
    return;
  }

  // Copy pre-compiled Assets.car to the app bundle
  const destAssetsCar = path.join(resourcesDir, 'Assets.car');
  try {
    fs.copyFileSync(precompiledAssets, destAssetsCar);
    console.log(`Liquid Glass icon copied: ${destAssetsCar}`);
  } catch (err) {
    // Don't fail the build if Assets.car can't be copied - app will use fallback icon.icns
    console.log(`Warning: Could not copy Assets.car: ${err.message}`);
    console.log('The app will use the fallback icon.icns on all macOS versions');
  }
};
