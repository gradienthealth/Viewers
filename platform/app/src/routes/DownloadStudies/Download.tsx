import React, { useEffect, useState } from 'react';
import { codDownload } from 'cod-retrieve';
import { useSystem } from '@ohif/core';

const Download: React.FC = () => {
  const [bucketDetails, setBucketDetails] = useState({
    bucket: '',
    bucketPrefix: 'dicomweb',
    studyUIDs: [],
    token: '',
    zip: false,
  });
  const [loadingMessage, setLoadingMessage] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [progress, setProgress] = useState({
    fetchCount: 0,
    fetchedSize: 0,
    savedCount: 0,
    savedTotal: 0,
    progressing: false,
  });
  const [stats, setStats] = useState({
    totalSeriesCount: 0,
    totalSavedSeriesCount: 0,
    totalSizeBytes: 0,
    totalSavedSizeBytes: 0,
    series: [],
    items: [],
  });
  const [fetchCompletedVisible, setFetchCompletedVisible] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('GB');

  const { servicesManager } = useSystem();
  const { userAuthenticationService } = servicesManager.services;
  const headers: unknown = userAuthenticationService.getAuthorizationHeader();

  useEffect(() => {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/');
    const bucket = pathParts[2];
    const bucketPrefix = pathParts.slice(3).join('/');
    const params = url.searchParams;
    const studyUIDs = params.getAll('StudyInstanceUIDs');
    const token = params.get('token');
    const zip = (params.get('zip') || '').toLowerCase() !== 'false';

    setBucketDetails({
      bucket,
      bucketPrefix: bucketPrefix ? `${bucketPrefix}/dicomweb` : 'dicomweb',
      studyUIDs,
      token,
      zip,
    });
  }, []);

  const handleSubmit = async () => {
    const { bucket, bucketPrefix, studyUIDs, zip } = bucketDetails;
    let token = bucketDetails.token;
    try {
      if (!studyUIDs.length) {
        alert('No StudyInstanceUIDs found to fetch metadata.');
        return;
      }

      setLoadingMessage('Validating token and initializing Directory...');
      setConfirmationMessage('');
      setProgress({
        fetchCount: 0,
        fetchedSize: 0,
        savedCount: 0,
        savedTotal: 0,
        progressing: false,
      });
      setFetchCompletedVisible(false);

      if (token) {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Validate token by making a lightweight authenticated request to bucket metadata
        try {
          const tokenValidationResponse = await fetch(
            `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${bucketPrefix.split('/dicomweb')[0]}/&delimiter=/`,
            { headers }
          );
          if (!tokenValidationResponse.ok) {
            alert(
              'Token is expired or unauthorized. Please provide a valid token or remove the token query param to use the Viewer login token.'
            );
            setLoadingMessage('');
            return;
          }
        } catch (error) {
          alert('Error validating token: ' + error.message);
          setLoadingMessage('');
          return;
        }
      } else {
        token = (headers as Record<string, string>).Authorization.split('Bearer ')[1];
      }

      try {
        await codDownload.initDirectory(zip);
        codDownload.initBucket({ bucket, bucketPrefix, token });
      } catch (err) {
        // User cancelled folder selection or error occurred
        console.warn('Folder selection cancelled or failed');
        return;
      }

      setLoadingMessage('Fetching Medatata and calculating Stats...');

      const {
        totalSeriesCount,
        totalSavedSeriesCount,
        totalSizeBytes,
        totalSavedSizeBytes,
        series,
        items,
      } = await codDownload.getStats(studyUIDs);

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

      const seriesToFetch = `Found ${totalSeriesCount} series with a total size of ${totalSizeDisplay}.`;
      const seriesAlreadyFetched = totalSavedSeriesCount
        ? (totalSavedSeriesCount === totalSeriesCount
            ? `These ${totalSavedSeriesCount} series are`
            : `${totalSavedSeriesCount} out of these with the size of ${totalSavedSizeDisplay} are`) +
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
      setSizeUnit(sizeUnit);
      setLoadingMessage('');
      setStats({
        totalSeriesCount,
        totalSavedSeriesCount,
        totalSizeBytes,
        totalSavedSizeBytes,
        series,
        items,
      });
      setSeriesList(series);
    } catch (e) {
      alert('Invalid URL format. ' + e.message);
      console.warn(e);
      setLoadingMessage('');
    }
  };

  const handleStart = async () => {
    const { studyUIDs, zip } = bucketDetails;

    setConfirmationMessage('');
    setProgress({
      fetchCount: 0,
      fetchedSize: 0,
      savedCount: 0,
      savedTotal: stats.items.length,
      progressing: true,
    });

    const progressCallback = ({ url, bytesDownloaded, bytesTotal }) => {
      setProgress(prevState => ({
        fetchCount: prevState.fetchCount,
        fetchedSize: (prevState.fetchedSize += bytesDownloaded),
        savedCount: prevState.savedCount,
        savedTotal: prevState.savedTotal,
        progressing: true,
      }));
    };

    const downloadedCallback = ({ url, size, file }) => {
      setProgress(prevState => ({
        fetchCount: prevState.fetchCount + 1,
        fetchedSize: prevState.fetchedSize,
        savedCount: prevState.savedCount,
        savedTotal: prevState.savedTotal,
        progressing: true,
      }));
    };

    const savedCallback = ({ url, file }) => {
      setProgress(prevState => ({
        fetchCount: prevState.fetchCount,
        fetchedSize: prevState.fetchedSize,
        savedCount: prevState.savedCount + 1,
        savedTotal: prevState.savedTotal,
        progressing: true,
      }));
    };

    const completedCallback = ({ files }) => {
      setProgress({
        fetchCount: 0,
        fetchedSize: 0,
        savedCount: 0,
        savedTotal: 0,
        progressing: false,
      });
      setLoadingMessage('');
      setFetchCompletedVisible(true);
    };

    if (seriesList.length || zip) {
      const job = await codDownload.download(studyUIDs, zip);
      job.onProgress(progressCallback);
      job.onDownload(downloadedCallback);
      job.onSave(savedCallback);
      job.onComplete(completedCallback);

      await job.start();
    } else {
      completedCallback({ files: [] });
    }
  };

  const totalSeriesToFetch = stats.totalSeriesCount - stats.totalSavedSeriesCount;
  const totalBytesToFetch = stats.totalSizeBytes - stats.totalSavedSizeBytes;
  const fetchedBytesToUse = Math.min(progress.fetchedSize, totalBytesToFetch);
  const bytesFetchedText =
    (sizeUnit === 'MB'
      ? `${(fetchedBytesToUse / 1024 ** 2).toFixed(2)} MB / ${(totalBytesToFetch / 1024 ** 2).toFixed(2)} MB`
      : `${(fetchedBytesToUse / 1024 ** 3).toFixed(2)} GB / ${(totalBytesToFetch / 1024 ** 3).toFixed(2)} GB`) +
    ' fetched.';

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
            disabled={!!loadingMessage || progress.progressing}
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

        {!!loadingMessage && (
          <div className="my-6 text-center">
            <div className={spinnerClass}></div>
            <div className="mt-2">{loadingMessage}</div>
          </div>
        )}

        {progress.progressing && (
          // Fetch progress and Saved progress
          <>
            {totalSeriesToFetch ? (
              <>
                <div className="mx-auto my-4 max-w-3xl">
                  <progress
                    id="fetchProgressBar"
                    className="h-5 w-full rounded"
                    value={(progress.fetchedSize / totalBytesToFetch) * 100}
                    max={100}
                  />
                  <div
                    id="fetch-progress-stats"
                    className="mt-2 text-center text-sm font-bold"
                  >
                    {`${progress.fetchCount} / ${totalSeriesToFetch} series fetched,  ` +
                      bytesFetchedText}
                  </div>
                </div>

                <div className="mx-auto my-4 max-w-3xl">
                  <progress
                    id="savedProgressBar"
                    className="h-5 w-full rounded"
                    value={(progress.savedCount / progress.savedTotal) * 100}
                    max={100}
                  />
                  <div
                    id="saved-progress-stats"
                    className="mt-2 text-center text-sm font-bold"
                  >
                    {`${progress.savedCount}/ ${progress.savedTotal} dicom files extracted and saved.`}
                  </div>
                </div>
              </>
            ) : (
              ''
            )}

            {bucketDetails.zip && progress.savedCount === progress.savedTotal && (
              <div className="my-6 text-center">
                <div className={spinnerClass}></div>
                <div className="mt-2">Zipping the studies...</div>
              </div>
            )}
          </>
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
