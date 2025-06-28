import fs from 'fs/promises';
import path from 'path';

const cleanTempFolderMiddleware = async (req, res, next) => {
  try {
    const folderPath = 'public/temp';
    const files = await fs.readdir(folderPath);
    const filesToDelete = files.filter(file => file !== '.gitkeep');

    if (filesToDelete.length === 0) {
      console.log('No files to delete in temp folder'); 
      return next(); // go to next middleware (upload)
    }

    for (const file of filesToDelete) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await fs.unlink(filePath);
      }
    }

    console.log('Temp folder cleaned');
    next(); // go to next middleware (upload)
  } catch (err) {
    console.error('Error cleaning temp folder:', err);
    next(err); // pass error to Express error handler
  }
};

export {cleanTempFolderMiddleware}
