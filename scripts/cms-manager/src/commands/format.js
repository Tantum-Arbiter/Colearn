/**
 * Format Command
 * Formats and normalizes story data to ensure consistency
 */

import chalk from 'chalk';
import crypto from 'crypto';
import { loadStory, loadAllStories, saveStory } from '../lib/story-loader.js';

export async function formatCommand(storyId, options) {
  console.log(chalk.cyan.bold('\n🎨 CMS Story Formatter\n'));

  try {
    if (storyId) {
      await formatSingleStory(storyId, options);
    } else if (options.all) {
      await formatAllStories(options);
    } else {
      console.log(chalk.yellow('Usage: cms format <story-id> or cms format --all'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function formatSingleStory(storyId, options) {
  console.log(`Formatting story: ${chalk.bold(storyId)}\n`);

  const story = await loadStory(storyId);
  if (!story) {
    console.log(chalk.red(`❌ Story not found: ${storyId}`));
    process.exit(1);
  }

  const { formatted, changes } = formatStoryData(story.data);

  if (changes.length === 0) {
    console.log(chalk.green('✅ Story is already properly formatted'));
    return;
  }

  console.log(`Changes to apply (${changes.length}):`);
  changes.forEach(change => {
    console.log(chalk.yellow(`  • ${change}`));
  });

  if (options.dryRun) {
    console.log(chalk.cyan('\n[DRY RUN] No changes written'));
    return;
  }

  await saveStory(storyId, formatted);
  console.log(chalk.green('\n✅ Story formatted and saved'));
}

async function formatAllStories(options) {
  const stories = await loadAllStories();

  if (stories.length === 0) {
    console.log(chalk.yellow('No stories found'));
    return;
  }

  console.log(`Formatting ${chalk.bold(stories.length)} stories\n`);

  let totalChanges = 0;

  for (const story of stories) {
    if (!story.data) {
      console.log(chalk.red(`❌ ${story.id}: Could not load`));
      continue;
    }

    const { formatted, changes } = formatStoryData(story.data);

    if (changes.length === 0) {
      console.log(chalk.gray(`   ${story.id}: No changes needed`));
    } else {
      console.log(chalk.yellow(`📝 ${story.id}: ${changes.length} change(s)`));
      totalChanges += changes.length;

      if (!options.dryRun) {
        await saveStory(story.id, formatted);
      }
    }
  }

  console.log(chalk.bold(`\n📊 Total changes: ${totalChanges}`));
  if (options.dryRun) {
    console.log(chalk.cyan('[DRY RUN] No files were modified'));
  }
}

/**
 * Format and normalize story data
 */
function formatStoryData(data) {
  const changes = [];
  const formatted = JSON.parse(JSON.stringify(data)); // Deep clone

  // Ensure required fields
  if (!formatted.isAvailable) {
    formatted.isAvailable = true;
    changes.push('Set isAvailable to true');
  }

  if (!formatted.isPremium) {
    formatted.isPremium = false;
    changes.push('Set isPremium to false');
  }

  if (!formatted.version) {
    formatted.version = 1;
    changes.push('Set version to 1');
  }

  if (!formatted.author) {
    formatted.author = 'earlyroots';
    changes.push('Set author to earlyroots');
  }

  if (!formatted.tags) {
    formatted.tags = [];
    changes.push('Added empty tags array');
  }

  // Update duration to match page count
  if (formatted.pages && formatted.duration !== formatted.pages.length) {
    formatted.duration = formatted.pages.length;
    changes.push(`Updated duration to ${formatted.pages.length}`);
  }

  // Calculate and add checksum
  const checksum = calculateChecksum(formatted);
  if (formatted.checksum !== checksum) {
    formatted.checksum = checksum;
    changes.push('Updated checksum');
  }

  // Normalize page IDs
  if (formatted.pages) {
    formatted.pages.forEach((page, idx) => {
      const expectedId = idx === 0 ? `${formatted.id}-cover` : `${formatted.id}-${idx}`;
      if (page.id !== expectedId) {
        page.id = expectedId;
        changes.push(`Normalized page ${idx} ID to ${expectedId}`);
      }
    });
  }

  return { formatted, changes };
}

function calculateChecksum(story) {
  const content = JSON.stringify({
    title: story.title,
    pages: story.pages?.map(p => ({ text: p.text, type: p.type })),
  });
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

