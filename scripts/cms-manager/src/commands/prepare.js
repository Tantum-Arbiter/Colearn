/**
 * Prepare Command
 * Prepares all stories for upload: validate, format, and generate manifests
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { loadAllStories, saveStory, getStoryAssets, CMS_STORIES_DIR } from '../lib/story-loader.js';
import { fullValidation } from '../lib/schema-validator.js';

export async function prepareCommand(options) {
  console.log(chalk.cyan.bold('\n📦 CMS Prepare for Upload\n'));
  console.log('This will validate, format, and generate manifests for all stories.\n');

  try {
    const stories = await loadAllStories();

    if (stories.length === 0) {
      console.log(chalk.yellow('No stories found in cms-stories directory'));
      return;
    }

    console.log(`Found ${chalk.bold(stories.length)} stories\n`);
    console.log('─'.repeat(60) + '\n');

    // Phase 1: Validate all stories
    console.log(chalk.bold('Phase 1: Validation\n'));
    let validCount = 0;
    let invalidStories = [];

    for (const story of stories) {
      if (!story.data) {
        console.log(chalk.red(`❌ ${story.id}: Could not load`));
        invalidStories.push(story.id);
        continue;
      }

      const result = await fullValidation(story.data);
      if (result.valid) {
        console.log(chalk.green(`✅ ${story.id}`));
        validCount++;
      } else {
        console.log(chalk.red(`❌ ${story.id}: ${result.schemaErrors.length + result.customErrors.length} error(s)`));
        invalidStories.push(story.id);
      }
    }

    if (invalidStories.length > 0 && !options.force) {
      console.log(chalk.red(`\n❌ ${invalidStories.length} stories have validation errors`));
      console.log(chalk.yellow('Use --force to continue anyway'));
      process.exit(1);
    }

    // Phase 2: Format all stories
    console.log(chalk.bold('\nPhase 2: Formatting\n'));
    for (const story of stories) {
      if (!story.data || invalidStories.includes(story.id)) continue;

      const formatted = formatStoryData(story.data);
      if (!options.dryRun) {
        await saveStory(story.id, formatted);
      }
      console.log(chalk.green(`✅ ${story.id}`));
    }

    // Phase 3: Generate asset manifests
    console.log(chalk.bold('\nPhase 3: Asset Manifests\n'));
    const uploadManifest = {
      generatedAt: new Date().toISOString(),
      stories: [],
    };

    for (const story of stories) {
      if (!story.data || invalidStories.includes(story.id)) continue;

      const assets = await getStoryAssets(story.id);
      const storyManifest = {
        storyId: story.id,
        storyDataPath: `cms-stories/${story.id}/story-data.json`,
        assets: assets.map(a => ({
          localPath: `cms-stories/${story.id}/${a.relativePath}`,
          gcsPath: a.gcsPath,
        })),
        assetCount: assets.length,
      };

      uploadManifest.stories.push(storyManifest);
      console.log(chalk.green(`✅ ${story.id}: ${assets.length} assets`));
    }

    // Save upload manifest
    const manifestPath = path.join(CMS_STORIES_DIR, 'upload-manifest.json');
    if (!options.dryRun) {
      await fs.writeFile(manifestPath, JSON.stringify(uploadManifest, null, 2) + '\n', 'utf-8');
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`   ${chalk.green('✅ Prepared:')} ${validCount} stories`);
    console.log(`   ${chalk.red('❌ Skipped:')} ${invalidStories.length} stories`);
    console.log(`   📄 Manifest: ${manifestPath}`);

    if (options.dryRun) {
      console.log(chalk.cyan('\n[DRY RUN] No files were modified'));
    } else {
      console.log(chalk.green('\n✅ Ready for upload!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  1. Commit changes to git'));
      console.log(chalk.gray('  2. Push to trigger GitHub Actions'));
      console.log(chalk.gray('  3. Pipeline will upload to Firestore + GCS'));
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

function formatStoryData(data) {
  const formatted = JSON.parse(JSON.stringify(data));
  
  formatted.isAvailable = formatted.isAvailable ?? true;
  formatted.isPremium = formatted.isPremium ?? false;
  formatted.version = formatted.version ?? 1;
  formatted.author = formatted.author ?? 'earlyroots';
  formatted.tags = formatted.tags ?? [];
  formatted.duration = formatted.pages?.length ?? formatted.duration;

  const checksum = crypto.createHash('sha256')
    .update(JSON.stringify({ title: formatted.title, pages: formatted.pages?.map(p => ({ text: p.text })) }))
    .digest('hex').substring(0, 16);
  formatted.checksum = checksum;

  return formatted;
}

