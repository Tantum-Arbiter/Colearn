/**
 * Validate Command
 * Validates story-data.json files against the schema
 */

import chalk from 'chalk';
import { loadStory, loadAllStories } from '../lib/story-loader.js';
import { fullValidation } from '../lib/schema-validator.js';

export async function validateCommand(storyId, options) {
  console.log(chalk.cyan.bold('\n🔍 CMS Story Validator\n'));

  try {
    if (storyId) {
      // Validate single story
      await validateSingleStory(storyId, options);
    } else if (options.all) {
      // Validate all stories
      await validateAllStories(options);
    } else {
      console.log(chalk.yellow('Usage: cms validate <story-id> or cms validate --all'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function validateSingleStory(storyId, options) {
  console.log(`Validating story: ${chalk.bold(storyId)}\n`);

  const story = await loadStory(storyId);
  if (!story) {
    console.log(chalk.red(`❌ Story not found: ${storyId}`));
    process.exit(1);
  }

  const result = await fullValidation(story.data);
  printValidationResult(storyId, result, options.verbose);

  if (!result.valid) {
    process.exit(1);
  }
}

async function validateAllStories(options) {
  const stories = await loadAllStories();

  if (stories.length === 0) {
    console.log(chalk.yellow('No stories found in cms-stories directory'));
    return;
  }

  console.log(`Found ${chalk.bold(stories.length)} stories\n`);
  console.log('─'.repeat(60) + '\n');

  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;

  for (const story of stories) {
    if (!story.data) {
      console.log(chalk.red(`❌ ${story.id}: Could not load - ${story.error}`));
      invalidCount++;
      continue;
    }

    const result = await fullValidation(story.data);

    if (result.valid) {
      if (result.warnings.length > 0) {
        console.log(chalk.yellow(`⚠️  ${story.id}: Valid with ${result.warnings.length} warning(s)`));
        warningCount++;
      } else {
        console.log(chalk.green(`✅ ${story.id}: Valid`));
      }
      validCount++;
    } else {
      const errorCount = result.schemaErrors.length + result.customErrors.length;
      console.log(chalk.red(`❌ ${story.id}: ${errorCount} error(s)`));
      invalidCount++;
    }

    if (options.verbose) {
      printValidationResult(story.id, result, true);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`   ${chalk.green('✅ Valid:')} ${validCount}`);
  console.log(`   ${chalk.yellow('⚠️  Warnings:')} ${warningCount}`);
  console.log(`   ${chalk.red('❌ Invalid:')} ${invalidCount}`);
  console.log(`   📁 Total: ${stories.length}`);

  if (invalidCount > 0) {
    console.log(chalk.red('\n❌ Validation failed - fix errors before uploading'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ All stories are valid'));
  }
}

function printValidationResult(storyId, result, verbose) {
  if (verbose && result.schemaErrors.length > 0) {
    console.log(chalk.red('   Schema Errors:'));
    result.schemaErrors.forEach(err => {
      console.log(chalk.red(`   • ${err.detail}`));
    });
  }

  if (verbose && result.customErrors.length > 0) {
    console.log(chalk.red('   Custom Validation Errors:'));
    result.customErrors.forEach(err => {
      console.log(chalk.red(`   • ${err}`));
    });
  }

  if (verbose && result.warnings.length > 0) {
    console.log(chalk.yellow('   Warnings:'));
    result.warnings.forEach(warn => {
      console.log(chalk.yellow(`   • ${warn}`));
    });
  }

  if (verbose) console.log('');
}

