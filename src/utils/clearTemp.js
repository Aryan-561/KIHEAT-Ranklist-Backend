import fs from 'fs/promises';
import path from 'path';

/**
 * Cleans the given temporary folder by deleting all files except `.gitkeep`.
 *
 * @param {string} [folderPath="public/temp"] - Path to the folder to clean.
 * @returns {Promise<void>}
 *
 * This function:
 *   1. Reads all files in the folder.
 *   2. Filters out `.gitkeep`.
 *   3. Deletes each remaining file.
 *   4. Logs actions for visibility.
 */


async function cleanTempFolder(folderPath = "public/temp") {
  try {
    const files = await fs.readdir(folderPath);

    // Filter out `.gitkeep`
    const filesToDelete = files.filter(file => file !== '.gitkeep');

    if (filesToDelete.length === 0) {
      console.log('No files to delete in temp folder (except .gitkeep)');
      return;
    }

    for (const file of filesToDelete) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    }

    console.log('Temp folder cleaned (except .gitkeep)');
  } catch (err) {
    console.error('Error cleaning temp folder:', err);
  }
}

export { cleanTempFolder };
