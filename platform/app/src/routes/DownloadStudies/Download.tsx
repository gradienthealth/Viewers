import React, { useEffect, useState } from 'react';
import untar from 'js-untar';

interface SeriesMetadataPath {
  seriesInstanceUID: string;
  objectName: string;
}

interface SeriesMetadataResult {
  studyInstanceUID: string;
  seriesMetadataPaths: SeriesMetadataPath[];
}

interface MetadataInstance {
  size: number;
  uri: string;
}

interface SeriesMetadata {
  deid_study_uid: string;
  deid_series_uid: string;
  cod: {
    instances: Record<string, MetadataInstance>;
  };
}

const Download: React.FC = () => {
  const [bucketDetails, setBucketDetails] = useState({
    bucket: '',
    bucketPrefix: 'dicomweb',
    studyUIDs: [],
    token: '',
  });
  const [loading, setLoading] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [progress, setProgress] = useState({ value: 0, stats: '' });
  const [fetchCompletedVisible, setFetchCompletedVisible] = useState(false);
  const [folderHandle, setFolderHandle] = useState(null);

  // Store tar files details for download
  const [tarFiles, setTarFiles] = useState<{ url: string; size: number }[]>([]);
  const [sizeUnit, setSizeUnit] = useState('GB');
  const [totalSizeDisplay, setTotalSizeDisplay] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/');
    const bucket = pathParts[2];
    const bucketPrefix = pathParts.slice(3).join('/');
    const params = url.searchParams;
    const studyUIDs = params.getAll('StudyInstanceUIDs');
    const token = params.get('token');

    setBucketDetails({
      bucket,
      bucketPrefix: bucketPrefix ? `${bucketPrefix}/dicomweb` : 'dicomweb',
      studyUIDs,
      token,
    });
  }, []);

  async function findSeriesMetadataPathsForStudy(
    bucketName: string,
    bucketPrefix: string,
    studyInstanceUIDs: string[],
    headers: Record<string, string>
  ): Promise<SeriesMetadataResult[]> {
    const studyPromises = studyInstanceUIDs.map(async studyInstanceUID => {
      const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?prefix=${bucketPrefix}/studies/${studyInstanceUID}/series/&delimiter=/`;
      try {
        const data = await fetch(url, { headers }).then(res => res.json());

        const seriesMetadataPaths = (data.prefixes || [])
          .map((prefix: string) => {
            try {
              const seriesInstanceUID = prefix.split('/series/')[1].split('/')[0];
              const objectName = prefix + 'metadata.json';
              return {
                seriesInstanceUID,
                objectName,
              };
            } catch (error) {
              return null;
            }
          })
          .filter(Boolean);

        return {
          studyInstanceUID,
          seriesMetadataPaths,
        };
      } catch (error) {
        throw new Error('Error searching for series instance UIDs:' + error.message);
      }
    });

    return (await Promise.all(studyPromises)).filter(study => study.seriesMetadataPaths.length);
  }

  function parseUIDs(url: string): {
    studyInstanceUID: string;
    seriesInstanceUID: string;
  } {
    const urlParts = url.split('studies/')[1].split('/');
    return { studyInstanceUID: urlParts[0], seriesInstanceUID: urlParts[2] };
  }

  async function fetchSeriesMetadata(
    bucketName: string,
    headers: Record<string, string>,
    seriesMetadataPaths: SeriesMetadataPath[],
    logs: string[]
  ): Promise<{ results: SeriesMetadata[]; saved: string[] }> {
    const results = [];
    const saved = [];
    for (let i = 0; i < seriesMetadataPaths.length; i++) {
      const { objectName } = seriesMetadataPaths[i];
      const metadataUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(
        objectName
      )}?alt=media`;
      try {
        const metadata = await fetch(metadataUrl, { headers }).then(res => res.json());

        if (logs.length) {
          const { studyInstanceUID, seriesInstanceUID } = parseUIDs(objectName);
          Object.keys(metadata.cod.instances).forEach(sopInstanceUID => {
            const logString = createLogString(studyInstanceUID, seriesInstanceUID, sopInstanceUID);

            if (logs.includes(logString)) {
              saved.push(logString);
            }
          });
        }

        results.push(metadata);
      } catch (error) {
        results.push(error);
      }
    }

    return {
      results: results.filter(metadata => Object.values(metadata.cod?.instances)?.length),
      saved,
    };
  }

  function buildFolderTree(files) {
    const root = {};

    files.forEach(file => {
      const parts = file.name.split('/');
      let current = root;
      const isDicom = file.name.endsWith('.dcm');

      parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
          // Last part: file
          // Save dcm files as Blob for compatibility
          if (isDicom) {
            const blob = new Blob([file.buffer], { type: 'application/dicom' });
            current[part] = blob;
          } else {
            current[part] = file;
          }
        } else {
          // Directory
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      });
    });

    return root;
  }

  async function untarTarFile(arrayBuffer: ArrayBuffer) {
    return untar(arrayBuffer).catch(function (err) {
      console.error('Untar error:', err);
    });
  }

  async function appendInstances(downloadable, url: string, arrayBuffer: ArrayBuffer) {
    const extracted = await untarTarFile(arrayBuffer);
    const tree = buildFolderTree(extracted);

    const [studyInstanceUID, , seriesInstanceUID] = url
      .split('studies/')[1]
      .split('.tar')[0]
      .split('/');

    const studyHandle = await folderHandle.getDirectoryHandle(studyInstanceUID, { create: true });
    const seriesHandle = await studyHandle.getDirectoryHandle(seriesInstanceUID, { create: true });
    const instancesHandle = await seriesHandle.getDirectoryHandle('instances', { create: true });

    for (let index = 0; index < extracted.length; index++) {
      const file = extracted[index];
      const fileName = file.name.split('/').at(-1);
      const blob = new Blob([file.buffer], { type: 'application/dicom' });

      const fileHandle = await instancesHandle.getFileHandle(fileName.split('.dcm')[0], {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      const logFileHandle = await folderHandle.getFileHandle('log.json', { create: true });
      const logFile = await logFileHandle.getFile();
      const text = await logFile.text();
      const contents = text.trim() === '' ? { logs: [] } : JSON.parse(text);
      const logString = createLogString(
        studyInstanceUID,
        seriesInstanceUID,
        fileName.split('.dcm')[0]
      );
      if (!contents.logs.includes(logString)) {
        contents.logs.push(logString);
      }

      const logWritable = await logFileHandle.createWritable();
      await logWritable.write(JSON.stringify(contents));
      await logWritable.close();
    }

    downloadable[studyInstanceUID] = {
      ...downloadable[studyInstanceUID],
      [seriesInstanceUID]: tree,
    };
  }

  function createLogString(
    studyInstanceUID: string,
    seriesInstanceUID: string,
    sopInstanceUID: string
  ): string {
    return `${studyInstanceUID}/${seriesInstanceUID}/${sopInstanceUID}`;
  }

  const handleSubmit = async () => {
    const { bucket, bucketPrefix, studyUIDs, token } = bucketDetails;
    try {
      if (!studyUIDs.length) {
        alert('No StudyInstanceUIDs found to fetch metadata.');
        return;
      }

      if (!token) {
        alert('No token found for authorization.');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      setLoading(true);
      setConfirmationMessage('');
      setProgress({ value: 0, stats: '' });
      setFetchCompletedVisible(false);

      // Disable input and button handled by loading state

      // Validate token by making a lightweight authenticated request to bucket metadata
      try {
        const tokenValidationResponse = await fetch(
          `https://storage.googleapis.com/${bucket}?maxResults=10`,
          {
            headers,
          }
        );
        if (!tokenValidationResponse.ok) {
          alert('Token is expired or unauthorized. Please provide a valid token.');
          setLoading(false);
          return;
        }
      } catch (error) {
        alert('Error validating token: ' + error.message);
        setLoading(false);
        return;
      }

      // Prompt user to select a folder and try to fetch log.json
      let logs = [];
      try {
        const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        setFolderHandle(directoryHandle);
        let logFileHandle;
        try {
          logFileHandle = await directoryHandle.getFileHandle('log.json');
          const file = await logFileHandle.getFile();
          const contents = JSON.parse(await file.text());
          console.log('log.json contents:', contents);
          logs = contents.logs;
        } catch (err) {
          // log.json does not exist or cannot be read, handle gracefully
          console.warn('log.json not found or unreadable, continuing without it.');
        }
      } catch (err) {
        // User cancelled folder selection or error occurred
        console.warn('Folder selection cancelled or failed, continuing without it.');
      }

      // Find series metadata paths first
      const seriesMetadataResults = await findSeriesMetadataPathsForStudy(
        bucket,
        bucketPrefix,
        studyUIDs,
        headers
      );

      // Fetch all metadata JSON files before confirmation
      const allSeriesMetadataPaths = seriesMetadataResults.flatMap(
        study => study.seriesMetadataPaths
      );
      const { results: fetchedMetadata, saved } = await fetchSeriesMetadata(
        bucket,
        headers,
        allSeriesMetadataPaths,
        logs
      );

      setLoading(false);

      // Show confirmation UI
      setConfirmationMessage('');

      // Calculate total size and create urls of tar files
      const tarFiles: { url: string; size: number }[] = [];
      let totalSizeBytes = 0,
        totalSavedSizeBytes = 0,
        totalSavedSeriesCount = 0;
      const totalSeriesCount = fetchedMetadata.length;
      fetchedMetadata.forEach(seriesMetadata => {
        let sizeBytes = 0;
        Object.values(seriesMetadata.cod.instances).forEach(instance => {
          sizeBytes += instance.size;
        });
        const instance = Object.values(seriesMetadata.cod.instances)[0];

        const seriesLogString = `${seriesMetadata.deid_study_uid}/${seriesMetadata.deid_series_uid}`;
        if (
          saved.filter(log => log.includes(seriesLogString)).length ===
          Object.values(seriesMetadata.cod.instances).length
        ) {
          totalSavedSizeBytes += sizeBytes;
          totalSizeBytes += sizeBytes;
          totalSavedSeriesCount++;
          return;
        }

        const url =
          `https://storage.googleapis.com/${bucket}/` +
          `${bucketPrefix ? bucketPrefix + '/' : ''}studies/` +
          instance.uri.split('studies/')[1].split('://')[0];

        tarFiles.push({
          url,
          size: sizeBytes,
        });
        totalSizeBytes += sizeBytes;
      });

      let sizeUnit = 'GB';
      let totalSizeDisplay = (totalSizeBytes / 1024 ** 3).toFixed(2) + ' GB';
      if (totalSizeBytes < 1024 ** 3) {
        sizeUnit = 'MB';
        totalSizeDisplay = (totalSizeBytes / 1024 ** 2).toFixed(2) + ' MB';
      }
      let totalSavedSizeDisplay = (totalSavedSizeBytes / 1024 ** 3).toFixed(2) + ' GB';
      if (sizeUnit === 'MB') {
        totalSavedSizeDisplay = (totalSavedSizeBytes / 1024 ** 2).toFixed(2) + ' MB';
      }
      setSizeUnit(sizeUnit);
      setTotalSizeDisplay(totalSizeDisplay);
      setTarFiles(tarFiles);

      const seriesToFetch = `Found ${totalSeriesCount} series with a total size of ${totalSizeDisplay}.`;
      const seriesAlreadyFetched = totalSavedSeriesCount
        ? (totalSavedSeriesCount === totalSeriesCount
            ? `These ${totalSavedSeriesCount} series are`
            : `${totalSavedSeriesCount} out of these are with the size of ${totalSavedSizeDisplay} are`) +
          ` already available in the selected folder.`
        : '';
      const clickStartMessage =
        totalSeriesCount > totalSavedSeriesCount
          ? totalSavedSeriesCount
            ? 'Click Start to fetch the rest of the Data.'
            : 'Click Start to fetch the Data.'
          : '';
      setConfirmationMessage(`${seriesToFetch}
        ${seriesAlreadyFetched}
        ${clickStartMessage}`);

      // Prepare series list display
      const seriesListItems = tarFiles.map(tarFile =>
        tarFile.url.split('studies/')[1].replaceAll('/', '/ ')
      );
      setSeriesList(seriesListItems);
    } catch (e) {
      alert('Invalid URL format. ' + e.message);
      console.warn(e);
      setLoading(false);
    }
  };

  const handleStart = async () => {
    const total = tarFiles.length;

    setConfirmationMessage('');
    setProgress({ value: (0 / total) * 100, stats: `0 / ${total} fetched` });

    const downloadable = {};
    let fetchedSizeBytes = 0;

    for (let i = 0; i < tarFiles.length; i++) {
      try {
        const fetchedTarFile = await fetch(tarFiles[i].url, {
          headers: {
            Authorization: `Bearer ${bucketDetails.token}`,
          },
        }).then(res => res.arrayBuffer());
        await appendInstances(downloadable, tarFiles[i].url, fetchedTarFile);

        fetchedSizeBytes += tarFiles[i].size || 0;
        let sizeFetchedDisplay = '';
        if (sizeUnit === 'MB') {
          sizeFetchedDisplay = (fetchedSizeBytes / 1024 ** 2).toFixed(2) + ' MB';
        } else {
          sizeFetchedDisplay = (fetchedSizeBytes / 1024 ** 3).toFixed(2) + ' GB';
        }
        setProgress({
          value: ((i + 1) / total) * 100,
          stats: `${i + 1} / ${total} fetched, ${sizeFetchedDisplay}/ ${totalSizeDisplay}`,
        });
      } catch (error) {
        console.error(`Error fetching tar file ${tarFiles[i].url}:`, error);
        fetchedSizeBytes += tarFiles[i].size || 0;
        let sizeFetchedDisplay = '';
        if (sizeUnit === 'MB') {
          sizeFetchedDisplay = (fetchedSizeBytes / 1024 ** 2).toFixed(2) + ' MB';
        } else {
          sizeFetchedDisplay = (fetchedSizeBytes / 1024 ** 3).toFixed(2) + ' GB';
        }
        setProgress({
          value: ((i + 1) / total) * 100,
          stats: `${i + 1} / ${total} fetched (error), ${sizeFetchedDisplay}`,
        });
      }
    }

    console.log('Fetched all tar files.', downloadable);

    // createAndDownloadZip(downloadable);

    setProgress({ value: 0, stats: '' });
    setFetchCompletedVisible(true);
  };

  // Spinner animation class for Tailwind
  const spinnerClass =
    'animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600 border-t-transparent mx-auto';

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-900 p-6 text-white">
      <div className="w-full max-w-3xl">
        <div className="mb-4 flex flex-row items-center justify-center gap-4">
          <button
            id="submitBtn"
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            Select Download folder
          </button>
        </div>

        {confirmationMessage && (
          <div className="mx-auto mb-4 max-w-3xl rounded border border-blue-600 bg-blue-900 p-4">
            <p className="mb-2 whitespace-pre-line">{confirmationMessage}</p>
            <ul
              id="series-list"
              className="mb-2 max-h-52 list-disc overflow-y-auto pl-5 text-sm"
            >
              {seriesList.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <button
              id="startBtn"
              type="button"
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              onClick={handleStart}
            >
              {seriesList.length ? 'Start Download' : 'Ok'}
            </button>
          </div>
        )}

        {loading && (
          <div className="my-6 text-center">
            <div className={spinnerClass}></div>
            <div className="mt-2">Loading...</div>
          </div>
        )}

        {progress.stats && (
          <div className="mx-auto my-4 max-w-3xl">
            <progress
              id="progressBar"
              className="h-5 w-full rounded"
              value={progress.value}
              max={100}
            />
            <div
              id="progress-stats"
              className="mt-2 text-center text-sm font-bold"
            >
              {progress.stats}
            </div>
          </div>
        )}

        {fetchCompletedVisible && (
          <div
            id="fetch-completed-message"
            className="mt-6 text-center text-lg font-bold text-green-500"
          >
            Fetching completed.
          </div>
        )}
      </div>
    </div>
  );
};

export default Download;
