import chalk from 'chalk';
import { validateAchievementFolder, validateStoryAwards } from '../lib/achievement-validator.js';
import { loadAllStories } from '../lib/story-loader.js';

export async function achievementsCommand(options) {
  console.log(chalk.cyan.bold('\n🏅 Badge definitions\n'));

  const folder = await validateAchievementFolder();
  const ids = new Set(folder.definitions.map((definition) => definition.id));
  let valid = folder.valid;

  for (const result of folder.results) {
    const mark = result.valid ? chalk.green('✓') : chalk.red('✗');
    console.log(`${mark} ${result.file}`);
    result.errors.forEach((error) => console.log(chalk.red(`    ${error}`)));
    if (options.verbose) result.warnings.forEach((warning) => console.log(chalk.yellow(`    ${warning}`)));
  }

  for (const story of await loadAllStories()) {
    if (!story.data) continue;
    const errors = validateStoryAwards(story.data, ids);
    if (errors.length === 0) continue;
    valid = false;
    console.log(`${chalk.red('✗')} ${story.id}`);
    errors.forEach((error) => console.log(chalk.red(`    ${error}`)));
  }

  console.log(`\n${folder.results.length} badge definition(s)`);
  if (!valid) process.exit(1);
}
