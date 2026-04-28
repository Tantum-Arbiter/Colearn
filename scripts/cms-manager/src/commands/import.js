/**
 * Import Command
 * Import story from story-engine output directory
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { storyExists, saveStory, CMS_STORIES_DIR } from '../lib/story-loader.js';
import { fullValidation } from '../lib/schema-validator.js';

export async function importCommand(source, options) {
  console.log(chalk.cyan.bold('\n📥 Import Story from Story Engine\n'));

  try {
    // Resolve source path
    const sourcePath = path.resolve(source);

    // Check if source exists
    try {
      await fs.access(sourcePath);
    } catch {
      console.log(chalk.red(`❌ Source not found: ${sourcePath}`));
      process.exit(1);
    }

    // Check if it's a directory or story-data.json file
    const stat = await fs.stat(sourcePath);
    let storyDataPath;
    let sourceDir;

    if (stat.isDirectory()) {
      storyDataPath = path.join(sourcePath, 'story-data.json');
      sourceDir = sourcePath;
    } else if (sourcePath.endsWith('story-data.json')) {
      storyDataPath = sourcePath;
      sourceDir = path.dirname(sourcePath);
    } else {
      console.log(chalk.red('❌ Source must be a directory or story-data.json file'));
      process.exit(1);
    }

    // Load story data
    let storyData;
    try {
      const content = await fs.readFile(storyDataPath, 'utf-8');
      storyData = JSON.parse(content);
    } catch (error) {
      console.log(chalk.red(`❌ Could not load story-data.json: ${error.message}`));
      process.exit(1);
    }

    const storyId = storyData.id;
    console.log(`Story ID: ${chalk.bold(storyId)}`);
    console.log(`Title: ${storyData.title}`);
    console.log(`Pages: ${storyData.pages?.length || 0}`);
    console.log('');

    // Check if story already exists
    if (await storyExists(storyId) && !options.overwrite) {
      console.log(chalk.yellow(`⚠️  Story '${storyId}' already exists`));
      console.log(chalk.gray('Use --overwrite to replace existing story'));
      process.exit(1);
    }

    // Validate before import
    console.log('Validating story...');
    const validation = await fullValidation(storyData);

    if (!validation.valid) {
      console.log(chalk.red('\n❌ Story has validation errors:'));
      validation.schemaErrors.forEach(err => console.log(chalk.red(`   • ${err.detail}`)));
      validation.customErrors.forEach(err => console.log(chalk.red(`   • ${err}`)));
      console.log(chalk.yellow('\nFix these errors before importing.'));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      validation.warnings.forEach(warn => console.log(chalk.yellow(`   • ${warn}`)));
    }

    console.log(chalk.green('✅ Validation passed\n'));

    // Copy story directory to CMS
    const destDir = path.join(CMS_STORIES_DIR, storyId);
    console.log(`Copying to: ${destDir}`);

    // Create destination directory
    await fs.mkdir(destDir, { recursive: true });

    // Copy all files from source directory
    await copyDirectory(sourceDir, destDir);

    // Save formatted story data
    const formattedData = formatForCMS(storyData);
    await saveStory(storyId, formattedData);

    console.log(chalk.green('\n✅ Story imported successfully!'));
    console.log(chalk.gray(`\nNext: Run 'npm run cms validate ${storyId}' to verify`));

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function copyDirectory(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDirectory(srcPath, destPath);
    } else if (entry.name !== 'story-data.json') {
      // Copy all files except story-data.json (we save formatted version separately)
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function formatForCMS(data) {
  // Ensure asset paths follow CMS convention
  const storyId = data.id;
  const formatted = { ...data };

  // Update cover image path
  if (formatted.coverImage && !formatted.coverImage.startsWith('assets/stories/')) {
    formatted.coverImage = `assets/stories/${storyId}/cover/cover.webp`;
  }

  // Update page image paths
  if (formatted.pages) {
    formatted.pages = formatted.pages.map((page, idx) => ({
      ...page,
      id: page.id || (idx === 0 ? `${storyId}-cover` : `${storyId}-${idx}`),
      backgroundImage: page.backgroundImage?.startsWith('assets/stories/')
        ? page.backgroundImage
        : `assets/stories/${storyId}/${idx === 0 ? 'cover' : `page-${idx}`}/background.webp`,
    }));
  }

  return formatted;
}

