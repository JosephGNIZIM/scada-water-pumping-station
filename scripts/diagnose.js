#!/usr/bin/env node

/**
 * SCADA Diagnostics Helper
 * Utilitaire pour diagnostiquer et corriger les problèmes d'environnement
 * 
 * Usage:
 *   node scripts/diagnose.js [options]
 * 
 * Options:
 *   --check-all     Vérifier tout (par défaut)
 *   --check-env     Vérifier l'environnement
 *   --check-ports   Vérifier les ports
 *   --check-deps    Vérifier les dépendances
 *   --fix-ports     Tuer les processus occupant les ports
 *   --verbose       Mode verbeux
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

function check(label, ok, detail = '') {
  const icon = ok ? '✓' : '✗';
  const color = ok ? 'green' : 'red';
  const msg = `${icon} ${label}${detail ? ' - ' + detail : ''}`;
  log(msg, color);
  return ok;
}

// ============================================================================
// CHECK ENV
// ============================================================================

function checkEnvironment() {
  section('📋 Vérification de l\'environnement');
  
  let allGood = true;
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  
  allGood &= check('Node.js version', nodeMajor >= 18, `v${process.versions.node}`);
  allGood &= check('Backend build', fs.existsSync(path.join(projectRoot, 'backend', 'dist', 'app.js')), 'backend/dist/app.js');
  allGood &= check('Frontend build', fs.existsSync(path.join(projectRoot, 'frontend', 'dist', 'index.html')), 'frontend/dist/index.html');
  allGood &= check('Electron icon', fs.existsSync(path.join(projectRoot, 'electron', 'buildResources', 'icon.ico')), 'electron/buildResources/icon.ico');
  allGood &= check('Mosquitto config', fs.existsSync(path.join(projectRoot, 'electron', 'config', 'mosquitto.conf')), 'electron/config/mosquitto.conf');
  
  return allGood;
}

// ============================================================================
// CHECK PORTS
// ============================================================================

function checkPorts() {
  section('🔌 Vérification des ports');
  
  let allGood = true;
  const ports = [3000, 3001, 3002, 3003, 1883];
  
  try {
    const output = execSync('netstat -ano', { encoding: 'utf8' });
    
    for (const port of ports) {
      const occupied = output.includes(`:${port}`);
      const label = {
        3000: 'Backend',
        3001: 'Frontend Dev',
        3002: 'Alternative',
        3003: 'Alternative',
        1883: 'MQTT',
      }[port];
      
      if (occupied) {
        allGood = false;
        log(`✗ Port ${port} (${label}) - OCCUPÉ`, 'red');
        if (verbose) {
          const lines = output.split(/\r?\n/).filter(l => l.includes(`:${port}`));
          lines.forEach(l => log(`  ${l}`, 'yellow'));
        }
      } else {
        check(`Port ${port} (${label})`, true, 'disponible');
      }
    }
  } catch (e) {
    log('⚠ Impossible de vérifier les ports', 'yellow');
    allGood = false;
  }
  
  return allGood;
}

// ============================================================================
// CHECK DEPENDENCIES
// ============================================================================

function checkDependencies() {
  section('📦 Vérification des dépendances');
  
  let allGood = true;
  
  allGood &= check('Backend node_modules', fs.existsSync(path.join(projectRoot, 'backend', 'node_modules')), 'backend/node_modules');
  allGood &= check('Frontend node_modules', fs.existsSync(path.join(projectRoot, 'frontend', 'node_modules')), 'frontend/node_modules');
  
  if (fs.existsSync(path.join(projectRoot, 'backend', 'node_modules'))) {
    allGood &= check('Backend: Express', fs.existsSync(path.join(projectRoot, 'backend', 'node_modules', 'express')));
    allGood &= check('Backend: Sequelize', fs.existsSync(path.join(projectRoot, 'backend', 'node_modules', 'sequelize')));
  }
  
  if (fs.existsSync(path.join(projectRoot, 'frontend', 'node_modules'))) {
    allGood &= check('Frontend: React', fs.existsSync(path.join(projectRoot, 'frontend', 'node_modules', 'react')));
    allGood &= check('Frontend: Redux', fs.existsSync(path.join(projectRoot, 'frontend', 'node_modules', '@reduxjs')));
  }
  
  return allGood;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  log('\n🔧 SCADA Water Station - Diagnostic Tool\n', 'blue');
  
  const checkAll = args.length === 0 || args.includes('--check-all');
  const checkEnv = checkAll || args.includes('--check-env');
  const checkPortsFlag = checkAll || args.includes('--check-ports');
  const checkDeps = checkAll || args.includes('--check-deps');
  
  let allGood = true;
  
  if (checkEnv) allGood &= checkEnvironment();
  if (checkPortsFlag) allGood &= checkPorts();
  if (checkDeps) allGood &= checkDependencies();
  
  // Summary
  section('📊 Résumé');
  if (allGood) {
    log('✓ Tout est OK ! Vous pouvez lancer l\'application.', 'green');
    log('   npm run dev', 'cyan');
  } else {
    log('✗ Certains problèmes détectés. Voir ci-dessus.', 'red');
    log('\n💡 Suggestions :', 'yellow');
    log('   1. npm run install:all         (installer dépendances)', 'yellow');
    log('   2. npm run build                (compiler le code)', 'yellow');
    log('   3. npm run dev                  (lancer l\'app)', 'yellow');
  }
  
  process.exit(allGood ? 0 : 1);
}

main();
