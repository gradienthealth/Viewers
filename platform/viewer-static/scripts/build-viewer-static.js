const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const copyFolderRecursiveSync = require('./copy-folder-recursive-sync');

function onExit(childProcess){
  return new Promise((resolve, reject) => {
    childProcess.once('exit', (code, signal) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Exit with error code: '+code));
      }
    });
    childProcess.once('error', (err) => {
      reject(err);
    });
  });
}

(async () => {
  const dirPathViewer = path.join('..', 'viewer');
  const dirPathViewerStatic = path.join('.');
  const build = spawn('yarn', ['build:static'], {
    cwd: dirPathViewer,
    stdio: [process.stdin, process.stdout, process.stderr]
  });

  await onExit(build);

  console.log('copying dist folder');
  copyFolderRecursiveSync(
    path.join(dirPathViewer, 'dist'),
    path.join(dirPathViewerStatic, 'dist'));

  console.log('copying LICENSE');
  await fsPromises.copyFile(
    path.join(dirPathViewer, './LICENSE'),
    path.join(dirPathViewerStatic, 'LICENSE'));
})();
