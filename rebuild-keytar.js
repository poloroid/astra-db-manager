#!/usr/bin/env node

/**
 * Script to rebuild keytar for the current platform
 * This is often needed when keytar fails to load due to native compilation issues
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Rebuilding keytar for current platform...');
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Node Version: ${process.version}`);

try {
  // Remove existing keytar installation
  console.log('📦 Removing existing keytar installation...');
  execSync('npm uninstall keytar', { stdio: 'inherit' });
  
  // Reinstall keytar
  console.log('📦 Installing keytar...');
  execSync('npm install keytar', { stdio: 'inherit' });
  
  // Rebuild native modules
  console.log('🔨 Rebuilding native modules...');
  execSync('npm run electron-rebuild', { stdio: 'inherit' });
  
  console.log('✅ Keytar rebuild completed successfully!');
  console.log('🚀 Try running the application again.');
  
} catch (error) {
  console.error('❌ Error rebuilding keytar:', error.message);
  console.log('\n🔧 Manual steps to try:');
  console.log('1. Delete node_modules folder');
  console.log('2. Delete package-lock.json');
  console.log('3. Run: npm install');
  console.log('4. Run: npm run electron-rebuild');
  console.log('\n📚 For more help, see: https://github.com/atom/node-keytar#troubleshooting');
}
