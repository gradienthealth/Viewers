import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

export default function ObjectVersionsList({ show, versions, onVersionSelect, onClose }) {
  const element = useRef(null);

  const handleClick = e => {
    if (element.current && !element.current.contains(e.target)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);

    if (!show) {
      document.removeEventListener('click', handleClick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const filteredVersions = versions.sort(
    (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );

  return (
    <>
      {show ? (
        <div
          className="relative"
          ref={element}
        >
          <div
            className={`bg-primary-dark w-max-content absolute left-0 top-6 z-10 origin-top-left transform rounded p-1 text-sm shadow transition duration-300 ${
              show ? 'scale-100' : 'scale-0'
            }`}
          >
            {filteredVersions.length ? (
              filteredVersions.map((version, index) => (
                <div
                  key={`${version.generation}.${Math.random().toFixed(3)}`}
                  className="hover:bg-primary-main border-primary-active text-primary-active hover:text-primary-light hover:border-secondary-light cursor-pointer rounded border py-1 px-2"
                  onClick={evt => {
                    evt.preventDefault();
                    onVersionSelect(version);
                  }}
                >
                  {index === 0
                    ? 'Current Version'
                    : moment(version.updated).format('MMMM D, h:mm A')}
                </div>
              ))
            ) : (
              <div className="border-primary-active text-primary-active rounded border py-1 px-2">
                No noncurrent versions Found
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

ObjectVersionsList.propTypes = {
  show: PropTypes.bool,
  versions: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      generation: PropTypes.string,
      updated: PropTypes.string,
    })
  ).isRequired,
  onVersionSelect: PropTypes.func,
  onClose: PropTypes.func,
};
