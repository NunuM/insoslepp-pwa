class Audio {

    /**
     * @constructor
     * @param {string} source AKA plugin name
     */
    constructor(source) {
        this._source = source;
    }

    get source() {
        return this._source;
    }

    /**
     * @abstract
     * @param req
     * @param res
     * @param {{source_uri:string,origin:string}} audioEntity
     */
    process(req, res, audioEntity) {
        throw new Error('Must be implemented');
    }
}

module.exports = {Audio};
