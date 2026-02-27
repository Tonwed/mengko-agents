/**
 * electron-builder afterPack hook
 *
 * Copies the pre-compiled macOS 26+ Liquid Glass icon (Assets.car) into the
 * app bundle. The Assets.car file is compiled locally using actool with the
 * macOS 26 SDK (not available in CI), then committed to the repo.
 *
 * Also copies the Claude Agent SDK and Bun runtime from monorepo root to the app bundle.
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
const https = require('https');
const http = require('http');

function copyDirSync(src, dest, filter) {
  if (!fs.existsSync(src)) return;

  // Create dest directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Apply filter
    if (filter && !filter(srcPath)) continue;

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, filter);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    const request = (url) => {
      protocol.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function findSystemBun() {
  const { execSync } = require('child_process');
  try {
    // Try to find bun in PATH
    const whichCmd = process.platform === 'win32' ? 'where bun' : 'which bun';
    const bunPath = execSync(whichCmd, { encoding: 'utf-8' }).trim().split('\n')[0];
    if (fs.existsSync(bunPath)) {
      return bunPath;
    }
  } catch (e) {
    // bun not found in PATH
  }

  // Check common locations
  const commonPaths = [
    // Windows
    path.join(process.env.USERPROFILE || '', '.bun', 'bin', 'bun.exe'),
    path.join(process.env.USERPROFILE || '', '.bun', 'bun.exe'),
    // Unix
    path.join(process.env.HOME || '', '.bun', 'bin', 'bun'),
    '/usr/local/bin/bun',
    '/usr/bin/bun',
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

async function downloadBunRuntime(platform, destDir) {
  const bunVersion = 'bun-v1.3.5';
  let downloadUrl;
  let extractedDir;
  let binaryName;

  if (platform === 'darwin') {
    // Use arm64 for macOS (most common on Apple Silicon)
    downloadUrl = `https://github.com/oven-sh/bun/releases/download/${bunVersion}/bun-darwin-aarch64.zip`;
    extractedDir = 'bun-darwin-aarch64';
    binaryName = 'bun';
  } else if (platform === 'win32') {
    downloadUrl = `https://github.com/oven-sh/bun/releases/download/${bunVersion}/bun-windows-x64-baseline.zip`;
    extractedDir = 'bun-windows-x64-baseline';
    binaryName = 'bun.exe';
  } else {
    downloadUrl = `https://github.com/oven-sh/bun/releases/download/${bunVersion}/bun-linux-x64.zip`;
    extractedDir = 'bun-linux-x64';
    binaryName = 'bun';
  }

  const zipPath = path.join(destDir, 'bun.zip');
  const extractPath = path.join(destDir, 'bun-extracted');
  const destBinary = path.join(destDir, binaryName);

  console.log(`Downloading Bun runtime from ${downloadUrl}...`);

  // Create temp directory
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Download
  await downloadFile(downloadUrl, zipPath);
  console.log('Download complete');

  // Extract (using unzip on Unix, PowerShell on Windows)
  const { execSync } = require('child_process');
  if (platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${extractPath}"`, { stdio: 'inherit' });
  }

  // Copy binary
  const srcBinary = path.join(extractPath, extractedDir, binaryName);
  fs.copyFileSync(srcBinary, destBinary);

  // Make executable on Unix
  if (platform !== 'win32') {
    fs.chmodSync(destBinary, 0o755);
  }

  // Cleanup
  fs.unlinkSync(zipPath);
  fs.rmSync(extractPath, { recursive: true, force: true });

  console.log(`Bun runtime installed at ${destBinary}`);
}

module.exports = function afterPack(context) {
  return new Promise(async (resolve) => {
    try {
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

      // === Copy Bun Runtime ===
      const projectDir = context.packager.projectDir;
      const bunSource = path.join(projectDir, 'vendor', 'bun');
      const bunDest = path.join(resourcesDir, 'vendor', 'bun');
      const bunBinary = platform === 'win32' ? 'bun.exe' : 'bun';

      // Check if bun exists in vendor/bun (local build)
      const localBunBinary = path.join(bunSource, bunBinary);
      let bunCopied = false;

      if (fs.existsSync(localBunBinary)) {
        console.log(`Copying Bun runtime from ${localBunBinary}...`);
        if (!fs.existsSync(bunDest)) {
          fs.mkdirSync(bunDest, { recursive: true });
        }
        fs.copyFileSync(localBunBinary, path.join(bunDest, bunBinary));
        console.log('Bun runtime copied successfully');
        bunCopied = true;
      }

      // Try to use system bun (installed by CI setup-bun action)
      if (!bunCopied) {
        const systemBun = await findSystemBun();
        if (systemBun) {
          console.log(`Using system Bun runtime from ${systemBun}...`);
          if (!fs.existsSync(bunDest)) {
            fs.mkdirSync(bunDest, { recursive: true });
          }
          fs.copyFileSync(systemBun, path.join(bunDest, bunBinary));
          // Make executable on Unix
          if (platform !== 'win32') {
            fs.chmodSync(path.join(bunDest, bunBinary), 0o755);
          }
          console.log('Bun runtime copied successfully');
          bunCopied = true;
        }
      }

      // Fallback to downloading
      if (!bunCopied) {
        console.log('Bun runtime not found locally or in system, downloading...');
        try {
          await downloadBunRuntime(platform, bunDest);
        } catch (err) {
          console.log(`Warning: Failed to download Bun runtime: ${err.message}`);
          console.log('The app may not work correctly without the bundled runtime');
        }
      }

      // === Copy Claude Agent SDK ===
      const workspaceRoot = path.resolve(projectDir, '..', '..');
      const sdkSource = path.join(workspaceRoot, 'node_modules', '@anthropic-ai', 'claude-agent-sdk');
      const sdkDest = path.join(resourcesDir, 'app', 'node_modules', '@anthropic-ai', 'claude-agent-sdk');

      console.log(`afterPack: workspaceRoot=${workspaceRoot}`);
      console.log(`afterPack: sdkSource=${sdkSource}`);
      console.log(`afterPack: sdkDest=${sdkDest}`);

      if (fs.existsSync(sdkSource)) {
        console.log('Copying Claude Agent SDK...');

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

        copyDirSync(sdkSource, sdkDest, filter);
        console.log('Claude Agent SDK copied successfully');
      } else {
        console.log(`Warning: Claude Agent SDK not found at ${sdkSource}`);
      }

      // === Copy macOS Liquid Glass Icon ===
      if (platform !== 'darwin') {
        console.log('Skipping Liquid Glass icon (not macOS)');
        resolve();
        return;
      }

      const precompiledAssets = path.join(projectDir, 'resources', 'Assets.car');

      console.log(`afterPack: looking for Assets.car at ${precompiledAssets}`);

      // Check if pre-compiled Assets.car exists
      if (!fs.existsSync(precompiledAssets)) {
        console.log('Warning: Pre-compiled Assets.car not found in resources/');
        console.log('The app will use the fallback icon.icns on all macOS versions');
        resolve();
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

      resolve();
    } catch (err) {
      console.error('afterPack error:', err);
      // Don't fail the build - just resolve
      resolve();
    }
  });
};
