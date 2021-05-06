const fs = require('fs');
const path = require('path');

const {Audio} = require('./audio');

class LocalAudio extends Audio {

    /**
     * @constructor
     * @param {string} folder
     */
    constructor(folder) {
        super('local');
        this._folder = folder
    }

    /**
     * @inheritDoc
     */
    process(req, res, audioEntity) {

        if(req.method === 'POST') {
            res.json({url: req.originalUrl})
            return;
        }

        const fileName = path.join(this._folder, audioEntity.source_uri);

        const stat = fs.statSync(fileName);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1;

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(fileName, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mp4',
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(fileName).pipe(res);
        }
    }
}

module.exports = LocalAudio;
