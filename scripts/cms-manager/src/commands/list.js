/**
 * List Command
 * Lists all stories with their validation status
 */

import chalk from 'chalk';
import { loadAllStories, getStoryAssets } from '../lib/story-loader.js';
import { fullValidation } from '../lib/schema-validator.js';

export async function listCommand(options) {
  if (!options.json) {
    console.log(chalk.cyan.bold('\n📚 CMS Stories\n'));
  }

  try {
    const stories = await loadAllStories();

    if (stories.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ stories: [] }));
      } else {
        console.log(chalk.yellow('No stories found in cms-stories directory'));
      }
      return;
    }

    const storyList = [];

    for (const story of stories) {
      const storyInfo = {
        id: story.id,
        title: story.data?.title || 'Unknown',
        category: story.data?.category || 'Unknown',
        ageRange: story.data?.ageRange || 'Unknown',
        pages: story.data?.pages?.length || 0,
        isPremium: story.data?.isPremium || false,
        hasLocalizations: !!(story.data?.localizedTitle && Object.keys(story.data.localizedTitle).length > 1),
        validation: { valid: false, errors: 0, warnings: 0 },
        assets: 0,
      };

      if (story.data) {
        const validation = await fullValidation(story.data);
        storyInfo.validation = {
          valid: validation.valid,
          errors: validation.schemaErrors.length + validation.customErrors.length,
          warnings: validation.warnings.length,
        };

        const assets = await getStoryAssets(story.id);
        storyInfo.assets = assets.length;
      } else {
        storyInfo.loadError = story.error;
      }

      storyList.push(storyInfo);
    }

    if (options.json) {
      console.log(JSON.stringify({ stories: storyList }, null, 2));
      return;
    }

    // Print formatted table
    console.log('─'.repeat(90));
    console.log(
      chalk.bold(
        padRight('ID', 30) +
        padRight('Title', 25) +
        padRight('Category', 12) +
        padRight('Pages', 6) +
        padRight('Assets', 7) +
        'Status'
      )
    );
    console.log('─'.repeat(90));

    for (const story of storyList) {
      const statusIcon = story.validation.valid
        ? (story.validation.warnings > 0 ? chalk.yellow('⚠️ ') : chalk.green('✅'))
        : chalk.red('❌');

      const statusText = story.validation.valid
        ? (story.validation.warnings > 0 ? `${story.validation.warnings} warn` : 'Valid')
        : `${story.validation.errors} err`;

      const row =
        padRight(story.id, 30) +
        padRight(truncate(story.title, 23), 25) +
        padRight(story.category, 12) +
        padRight(String(story.pages), 6) +
        padRight(String(story.assets), 7) +
        statusIcon + ' ' + statusText;

      console.log(row);
    }

    console.log('─'.repeat(90));

    // Summary
    const validCount = storyList.filter(s => s.validation.valid).length;
    const invalidCount = storyList.filter(s => !s.validation.valid).length;
    const premiumCount = storyList.filter(s => s.isPremium).length;
    const localizedCount = storyList.filter(s => s.hasLocalizations).length;

    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`   Total: ${storyList.length} stories`);
    console.log(`   ${chalk.green('Valid:')} ${validCount}  ${chalk.red('Invalid:')} ${invalidCount}`);
    console.log(`   Premium: ${premiumCount}  Localized: ${localizedCount}`);

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

function padRight(str, len) {
  return str.padEnd(len);
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len - 2) + '..';
}

