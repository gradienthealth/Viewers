import { Row } from '@tanstack/react-table';

import { CURRENT_OPFS_VERSION, OPFS_VERSION_STORAGE_KEY } from './constants';
import { FileDetails, Study } from './types';

function parsePath(path: string): {
  pathParts: string[];
  studyUID: string;
  seriesUID: string;
  bucketParts: string[];
  studyFolderPath: string;
  seriesFolderPath: string;
} {
  const pathParts = path.split('/').filter(part => !!part);
  if (pathParts.includes('partial')) {
    pathParts.splice(pathParts.indexOf('partial'), 1);
  }
  const pathPartsLength = pathParts.length;
  const seriesUID = pathParts[pathPartsLength - 2];
  const studyUID = pathParts[pathPartsLength - 3];
  const bucketParts = pathParts.slice(0, pathPartsLength - 3);
  const studyFolderPath = `${bucketParts.join('/')}/${studyUID}`;
  const seriesFolderPath = `${studyFolderPath}/${seriesUID}`;

  return { pathParts, studyUID, seriesUID, bucketParts, studyFolderPath, seriesFolderPath };
}

function createCloudPaths(
  bucketPath: string,
  studyUID: string,
  seriesUID: string
): { gsPath: string; storagePath: string } {
  const formattedFullPath = `${bucketPath}/studies/${studyUID}/series/${seriesUID}.tar`;
  const gsPath = `gs://${formattedFullPath}`;
  const storagePath = `https://storage.googleapis.com/${formattedFullPath}`;

  return { gsPath, storagePath };
}

function createViewerLink(studyUID: string, bucketParts: string[]): string {
  const { pathname, origin } = window.location;
  let routerBasename = window.config.routerBasename;

  routerBasename = routerBasename === '/' ? '' : routerBasename;
  const mode = pathname
    .slice(pathname.indexOf(routerBasename) + routerBasename.length)
    .split('/')[1];

  const studyURLParams = new URLSearchParams();
  studyURLParams.set('StudyInstanceUIDs', studyUID);
  studyURLParams.set('bucket', bucketParts[0]);
  studyURLParams.set('bucket-prefix', bucketParts.slice(1).join('/'));

  return `${origin}${routerBasename}/${mode}/cod?${studyURLParams.toString()}`;
}

async function getOPFSRootHandle(): Promise<FileSystemDirectoryHandle> {
  try {
    const rootHandle = await navigator.storage.getDirectory();
    return rootHandle;
  } catch (error) {
    console.error('Error accessing OPFS root:', error);
    throw error;
  }
}

async function getFileDetailsRecursive(
  dirHandle: FileSystemDirectoryHandle,
  currentPath: string = ''
): Promise<FileDetails[]> {
  const files: FileDetails[] = [];
  for await (const entry of dirHandle.values()) {
    const entryPath = `${currentPath}/${entry.name}`;
    if (entry.kind === 'file') {
      try {
        const file = await entry.getFile();
        const fileDetail: FileDetails = {
          path: entryPath,
          size: file.size,
          lastModified: file.lastModified,
        };

        if (entry.name === 'metadata.json') {
          const content = await file.text();
          try {
            fileDetail.data = JSON.parse(content);
          } catch (e) {
            console.warn(`Error parsing JSON from ${entryPath}:`, e);
          }
        }

        files.push(fileDetail);
      } catch (error) {
        console.error(`Error getting file details for ${entryPath}:`, error);
      }
    } else if (entry.kind === 'directory') {
      const subDirFiles = await getFileDetailsRecursive(
        entry as FileSystemDirectoryHandle,
        entryPath
      );
      files.push(...subDirFiles);
    }
  }
  return files;
}

function structureData(fileDetails: FileDetails[]): Study[] {
  const studiesMap: Record<string, Study> = {};
  const matchedFiles: FileDetails[] = [];

  const metadataFiles = fileDetails.filter(file => file.path.endsWith('/metadata.json'));

  metadataFiles.forEach(metadataFile => {
    const { studyUID, seriesUID, bucketParts, studyFolderPath, seriesFolderPath } = parsePath(
      metadataFile.path
    );

    if (!studyUID || !seriesUID || !Object.keys(metadataFile.data?.cod.instances)?.length) {
      return;
    }

    const firstInstance = Object.values(metadataFile.data.cod.instances)[0];
    const studyDescription = firstInstance.metadata['00081030']?.Value?.[0];
    const seriesDescription = firstInstance.metadata['0008103E']?.Value?.[0];
    const seriesModality = firstInstance.metadata['00080060']?.Value?.[0];

    let totalSeriesSize = 0;
    let seriesMostRecentModified = 0;

    fileDetails.forEach(file => {
      if (file.path.startsWith(`/${seriesFolderPath}/`)) {
        totalSeriesSize += file.size;
        if (file.lastModified > seriesMostRecentModified) {
          seriesMostRecentModified = file.lastModified;
        }
        matchedFiles.push(file);
      }
    });

    if (!studiesMap[studyUID]) {
      studiesMap[studyUID] = {
        id: studyUID,
        'study-uid': studyUID,
        'study-description': '',
        'study-modalities': [],
        'study-size': 0,
        'study-last-modified': 0,
        series: [],
        'viewer-link': '',
        'opfs-paths': [],
      };
    }

    const { gsPath, storagePath } = createCloudPaths(bucketParts.join('/'), studyUID, seriesUID);

    studiesMap[studyUID].series.push({
      'series-uid': seriesUID,
      'series-description': seriesDescription,
      'series-modality': seriesModality,
      'series-size': totalSeriesSize,
      'series-last-modified': seriesMostRecentModified,
      'series-gs-path': gsPath,
      'series-storage-path': storagePath,
    });

    // Adding/appending study properties
    studiesMap[studyUID]['study-size'] += totalSeriesSize;
    studiesMap[studyUID]['study-description'] ||= studyDescription;
    if (seriesMostRecentModified > studiesMap[studyUID]['study-last-modified']) {
      studiesMap[studyUID]['study-last-modified'] = seriesMostRecentModified;
    }
    if (seriesModality && !studiesMap[studyUID]['study-modalities'].includes(seriesModality)) {
      studiesMap[studyUID]['study-modalities'].push(seriesModality);
    }
    if (!studiesMap[studyUID]['viewer-link'] && seriesModality !== 'SEG') {
      studiesMap[studyUID]['viewer-link'] = createViewerLink(studyUID, bucketParts);
    }
    if (!studiesMap[studyUID]['opfs-paths'].includes(studyFolderPath)) {
      studiesMap[studyUID]['opfs-paths'].push(studyFolderPath);
    }
  });

  // Files without metadata.json
  const misMatchedFiles = fileDetails.filter(
    file => !matchedFiles.find(matchedFile => matchedFile.path === file.path)
  );
  misMatchedFiles.forEach(({ size, path, lastModified }) => {
    const { bucketParts, studyUID, seriesUID, studyFolderPath } = parsePath(path);

    const { gsPath, storagePath } = createCloudPaths(bucketParts.join('/'), studyUID, seriesUID);

    const series = {
      'series-uid': seriesUID,
      'series-description': '',
      'series-modality': '',
      'series-size': size,
      'series-last-modified': lastModified,
      'series-gs-path': gsPath,
      'series-storage-path': storagePath,
    };

    const studyFound = Object.values(studiesMap).find(study => path.includes(study['study-uid']));
    if (studyFound) {
      studiesMap[studyFound['study-uid']].series.push(series);

      studiesMap[studyFound['study-uid']]['study-size'] += size;
      if (lastModified > studiesMap[studyUID]['study-last-modified']) {
        studiesMap[studyFound['study-uid']]['study-last-modified'] = lastModified;
      }
    } else {
      studiesMap[studyUID] = {
        id: studyUID,
        'study-uid': studyUID,
        'study-description': '',
        'study-modalities': [],
        'study-size': size,
        'study-last-modified': lastModified,
        series: [series],
        'viewer-link': createViewerLink(studyUID, bucketParts),
        'opfs-paths': [studyFolderPath],
      };
    }
  });

  return Object.values(studiesMap);
}

export async function clearPreviousOPFSVersionData(): Promise<void> {
  try {
    const storedVersion = localStorage.getItem(OPFS_VERSION_STORAGE_KEY);
    if (!storedVersion?.trim() || parseInt(storedVersion, 10) < CURRENT_OPFS_VERSION) {
      const rootHandle = await getOPFSRootHandle();
      // The previous OPFS path version was storing and retrieving the files in the root directory.
      for await (const entry of rootHandle.values()) {
        if (entry.kind === 'file' || entry.name === 'partial') {
          await rootHandle.removeEntry(entry.name, { recursive: true });
        }
      }
    }

    localStorage.setItem(OPFS_VERSION_STORAGE_KEY, String(CURRENT_OPFS_VERSION));
  } catch (error) {
    console.warn('Error in clearing previous OPFS version data:', error);
  }
}

export async function getOPFSData(): Promise<Study[]> {
  try {
    const rootHandle = await getOPFSRootHandle();
    const allFiles = await getFileDetailsRecursive(rootHandle);
    return structureData(allFiles);
  } catch (error) {
    console.error('Error in fetching and structuring OPFS data:', error);
    return [];
  }
}

export async function deleteFoldersFromOPFS(folderPaths: string[]) {
  for (let index = 0; index < folderPaths.length; index++) {
    const path = folderPaths[index];

    try {
      const rootHandle = await getOPFSRootHandle();
      const pathParts = path.split('/');
      let currentDir = rootHandle;
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
      }
      currentDir.removeEntry(pathParts.at(-1), { recursive: true });
    } catch (error) {
      console.warn(`Error in deleting folder in OPFS: ${path}: ${error.message}`);
      throw error;
    }
  }
}

export function hybridGlobalFilter(
  row: Row<Study>,
  columnId: string,
  filterValue: string
): boolean {
  const cellValue = row.getValue(columnId);
  const cellValueString = String(cellValue).toLowerCase();
  const filterValueString = String(filterValue);

  if (filterValueString.startsWith('/') && filterValueString.endsWith('/')) {
    try {
      const cellValue = row.getValue(columnId);
      const regex = new RegExp(filterValueString.slice(1, -1), 'i');

      return regex.test(String(cellValue));
    } catch (e) {
      console.log('Regex filtering in OPFS tool failed:', e.message);
    }
  }

  // This runs if the input wasn't a valid regex pattern OR if the try-catch failed.
  return cellValueString.includes(filterValueString.toLowerCase());
}
