const ProgressResponse = (id, part, isLast, isStart = false) => {
  return {cmd: 1, id, part, isLast, isStart};
};

const ErrorResponse = (id, part, error) => {
  return {cmd: 2, id, part, error};
};

const DataResponse = (obj) => {
  return {cmd: 0, data: obj};
};

addEventListener('message', ({data}) => {
  switch (data.cmd) {
    case 'request':
      download(data.id)
        .catch((error) => {
          // @ts-ignore
          self.postMessage(ErrorResponse(data.id, 0, error));
        });
      break;
  }
}, false);

const download = async (id) => {
  let firstThrottle = 50e6;
  let isFirst = true;
  const pieces = [{start: 0, end: 999999, id: 0, last: false}];

  while (pieces.length !== 0) {

    const piece = pieces.shift();

    if (piece.start > firstThrottle) {
      firstThrottle += 50e6;
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 300000);
      });
    }

    const responsePromise = fetch('/api/audio/' + id, {
      headers: {
        Range: `bytes=${piece.start}-${piece.end}`
       }
    });

    if (isFirst) {
      const response = await responsePromise;

      if (!(response.status === 200 || response.status === 206)) {
        throw new Error('Could not download the first chunk for id:' + id);
      }
      if (response.headers.has('x-length')) {
        let aggregatedParts = 1e6;
        let part = 1;
        const totalSize = Number(response.headers.get('x-length'));
        const remaining = totalSize - aggregatedParts;

        if (remaining < 0) {
          piece.last = true;
        } else {
          do {
            const end = aggregatedParts + 10e6 - 1;
            pieces.push({
              start: aggregatedParts,
              // @ts-ignore
              end: end > remaining ? '-' : end,
              id: part,
              last: end > remaining
            });
            part += 1;
            aggregatedParts += 10e6;
          } while (remaining > aggregatedParts);
          // @ts-ignore
          self.postMessage(ProgressResponse(id, 0, piece.last, true));
        }
        // @ts-ignore
        processBuffer(await response.arrayBuffer(), id, piece);
      }
    } else {
      responsePromise.then((result) => {
        if (!(result.status === 200 || result.status === 206)) {
          // @ts-ignore
          self.postMessage(ErrorResponse(id, piece.id, new Error('Response status code' + result.status)));
          pieces.push(piece);
          return Promise.reject('');
        } else {
          // @ts-ignore
          self.postMessage(ProgressResponse(id, piece.id, piece.last));
          return result.arrayBuffer();
        }
      }).then((buffer) => {
        processBuffer(buffer, id, piece);
      });
    }

    isFirst = false;
  }
};


const processBuffer = (body, id, piece) => {
  // @ts-ignore
  self.postMessage(DataResponse({
    body,
    id,
    partId: piece.id,
    isLast: piece.last
  }));
};
