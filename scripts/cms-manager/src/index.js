#!/usr/bin/env node

/**
 * CMS Manager - Local tool for managing story content
 * 
 * Commands:
 *   validate [story-id]  - Validate stories against schema
 *   format [story-id]    - Format and normalize story data
 *   prepare              - Prepare all stories for upload (validate + format + manifest)
 *   import <source>      - Import from story-engine output
 *   list                 - List all stories with validation status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate.js';
import { formatCommand } from './commands/format.js';
import { prepareCommand } from './commands/prepare.js';
import { importCommand } from './commands/import.js';
import { listCommand } from './commands/list.js';

const program = new Command();

program
  .name('cms')
  .description('Local CMS management tool for story content')
  .version('1.0.0');

program
  .command('validate [storyId]')
  .description('Validate stories against schema')
  .option('-a, --all', 'Validate all stories')
  .option('-v, --verbose', 'Show detailed validation errors')
  .action(validateCommand);

program
  .command('format [storyId]')
  .description('Format and normalize story data')
  .option('-a, --all', 'Format all stories')
  .option('--dry-run', 'Show changes without writing')
  .action(formatCommand);

program
  .command('prepare')
  .description('Prepare all stories for upload (validate + format + generate manifests)')
  .option('--dry-run', 'Show what would be done without writing')
  .option('--force', 'Continue even if validation errors exist')
  .action(prepareCommand);

program
  .command('import <source>')
  .description('Import story from story-engine output directory')
  .option('--overwrite', 'Overwrite existing story if it exists')
  .action(importCommand);

program
  .command('list')
  .description('List all stories with their validation status')
  .option('--json', 'Output as JSON')
  .action(listCommand);

// Show help if no command provided
if (process.argv.length <= 2) {
  console.log(chalk.cyan.bold('\n📚 CMS Manager - Story Content Management\n'));
  console.log('Manage story content locally before uploading to Firestore/GCS.\n');
  program.help();
}

program.parse();

