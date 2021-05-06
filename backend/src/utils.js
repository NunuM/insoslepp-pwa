const fs = require('fs');
const jwt = require('jsonwebtoken');

const configs = require('../configs.json');


const SITEMAP_PATH = configs.sitemap;
const DOMAIN = configs.domain + '/posts';

const JWT_SECRET = configs.jwtSecrete;

class HttpError extends Error {

    constructor(message, status, headers, body) {
        super(message);
        this._status = status;
        this._headers = headers || {};
        this._body = body || {message};
    }

    response(res) {
        res.status(this._status);

        Object.keys(this._headers).forEach((h) => {
            res.setHeader(h, this._headers[k]);
        });

        res.json(this._body);
    }

    static notFound(message) {
        return new HttpError(message, 404, {}, {message: 'entity not found'});
    }

    static databaseError(message) {
        return new HttpError(message, 503, {}, {message: 'Try later'});
    }
}

class Sitemap {
    /**
     *
     * @param {number} postId
     * @param {Date} created
     * @return {Promise<void>}
     */
    static async appendToXML(postId, created) {
        const date = created.toISOString().split('T')[0];
        const xmlNode = `<url><loc>${DOMAIN}/${postId}</loc><lastmod>${date}</lastmod></url>\n`;
        fs.writeFile(SITEMAP_PATH, xmlNode, {flag: 'a'}, (err) => {
            if (err) {
                console.log('Could not write seo', err);
            }
        })
    }

    static async siteMap(res) {
        res.setHeader('Content-Type', 'application/xml');
        res.write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        const reader = fs.createReadStream(SITEMAP_PATH);
        reader.pipe(res, {end: false})

        reader.on('end', () => {
            res.write('</urlset>');
            res.end();
        });
    }
}

class DtoToDomain {

    /**
     *
     * @param {{title:string, category:string,description:string,summary:string}} generated
     * @param {number} audioSourceId
     * @return {{}}
     */
    static fromGenToPost(generated, audioSourceId) {
        return [
            generated.title,
            generated.description,
            generated.summary,
            1,
            audioSourceId,
            null,
            null,
            generated.category,
        ]
    }
}


class ErrorParser {

    static parse(error, req, res) {
        console.error(req.url,
            req.userId,
            req.get('correlation-id'),
            error.message
        );

        if (error instanceof HttpError) {
            error.response(res);
        } else {
            res.status(503).end();
        }
    }
}

class AppMiddlewares {
    static userMiddleware(req, res, next) {
        if (req.headers['authorization']) {
            jwt.verify(req.headers['authorization'],
                JWT_SECRET,
                (error, decoded) => {
                    if (error) {
                        next();
                    } else {
                        req.userId = decoded.userId;
                        next();
                    }
                });
        } else {
            next();
        }
    }

    static adminMiddleware(req, res, next) {
        if (req.headers['authorization']
            && req.headers['authorization'] === configs.admin.apikey) {
            next();
        } else {
            res.status(400).end();
        }
    }

    static adminUiMiddleware(req, res, next) {
        if (req.headers.authorization
            && `Basic ${Buffer.from(configs.admin.ui.username + ':' + configs.admin.ui.password).toString('base64')}` === req.headers.authorization) {
            next();
        } else {
            res.writeHead(401, {'WWW-Authenticate': 'Basic realm="User Visible Realm", charset="UTF-8"'});
            res.end();
        }
    }

    static corsMiddleware(req, res, next) {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('access-control-expose-headers', 'X-Length')
        } else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
        next();
    }
}

module.exports = {HttpError, Sitemap, DtoToDomain, ErrorParser, AppMiddlewares}
