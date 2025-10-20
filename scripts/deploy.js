#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Available apps in the project
const config = {
  admin: {
    hosting: 'admin-app',
    functions: 'admin-functions'
  },
  client: {
    hosting: 'client-app',
    functions: 'client-functions'
  }
};

// Function to execute commands
const execCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
};

// Function to deploy specific components
const deployComponents = async (app, components) => {
  const targets = components.map(component => {
    if (component === 'hosting') {
      return `hosting:${config[app][component]}`;
    }
    if (component === 'functions') {
      return `functions:${config[app][component]}`;
    }
    return component;
  });

  console.log(`Deploying ${targets.join(', ')} for ${app} app...`);

  try {
    // Build steps
    if (components.includes('hosting')) {
      await execCommand('npm', ['run', 'build:admin']);
    }
    if (components.includes('functions')) {
      await execCommand('npm', ['run', 'build:server']);
    }

    // Deploy to Firebase
    const deployCommand = [
      'firebase',
      'deploy',
      '--only',
      targets.join(',')
    ];

    await execCommand(deployCommand.join(' '), []);
    console.log('Deployment completed successfully!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  console.log('\nAvailable apps:');
  console.log('- admin: Netwin Tournament Admin Dashboard (netwin-tournament-admin)');
  console.log('- client: Main Netwin Tournament App (netwin-tournament)\n');
  
  rl.question('Which app do you want to deploy? (admin/client): ', async (app) => {
    if (!config[app]) {
      console.error('Invalid app selected. Please type either "admin" or "client"');
      rl.close();
      process.exit(1);
    }

    console.log(`\nSelected: ${app === 'admin' ? 'Admin Dashboard' : 'Main Tournament App'}`);
    rl.question('What components do you want to deploy?\n- hosting: Frontend only\n- functions: Backend only\n- all: Both frontend and backend\n\nYour choice: ', async (components) => {
      rl.close();
      
      let componentsToDeply = [];
      if (components === 'all') {
        componentsToDeply = ['hosting', 'functions'];
      } else {
        componentsToDeply = components.split(',').map(c => c.trim());
      }

      await deployComponents(app, componentsToDeply);
    });
  });
};

main().catch(console.error); 