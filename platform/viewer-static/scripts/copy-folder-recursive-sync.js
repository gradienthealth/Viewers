const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
      if (fs.lstatSync(path.join(from, element)).isFile()) {
          fs.copyFileSync(path.join(from, element), path.join(to, element));
      } else {
        copyFolderRecursiveSync(path.join(from, element), path.join(to, element));
      }
  });
};

module.exports = copyFolderRecursiveSync;
