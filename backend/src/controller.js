const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const mysql = require('mysql');

const queries = require('./queries');
const configs = require('../configs.json');
const {HttpError, _, DtoToDomain} = require('./utils');
const database = require('./database');

const JWT_SECRET = configs.jwtSecrete;

webpush.setVapidDetails(
    'mailto:' + configs.push.email,
    configs.push.publicKey,
    configs.push.privateKey
);

/**
 * @class
 */
class Controller {

    /**
     * @constructor
     */
    constructor() {
        /**
         *
         * @type {Map<string, Audio>}
         * @private
         */
        this._plugins = new Map();

        this.loadAudioPlugins();
    }

    /**
     * @private
     */
    loadAudioPlugins() {
        Object.keys(configs.plugins)
            .forEach((pluginName) => {
                try {
                    const clazz = require('./plugins/' + pluginName);

                    const instance = Reflect.construct(clazz, configs.plugins[pluginName].args);

                    this._plugins.set(instance.source, instance);
                } catch (e) {
                    console.log(`Cannot load plugin ${pluginName}`, e);
                }
            });
    }

    /**
     * All Categories
     * @return {Promise<[]>}
     */
    getCategories() {
        return database.executeQuery(queries.categories);
    }

    /**
     * Search Suggestion
     *
     * @param {string} q
     * @param {number} categoryId
     * @param {number} page
     * @return {Promise<[]>}
     */
    getSearchSuggestions(q, categoryId, page) {
        let queryToExecute = queries.searchWall;

        if (typeof q !== 'string') {
            return Promise.reject(new HttpError('Invalid query string', 400));
        }

        if (typeof categoryId === 'number' && Number.isSafeInteger(categoryId)) {
            queryToExecute = queryToExecute
                .addParams(categoryId)
                .withFilter('p.category_id');
        }

        queryToExecute = queryToExecute
            .addParams(`%${q.toLowerCase()}%`)
            .withFulTextSearch('p.title', 'p.description', 'p.body')
            .withPage(Number(page) || 0);

        return database.executeQuery(queryToExecute);
    }

    /**
     * Paged Wall
     *
     * @param {number|null} userId
     * @param {string|null} q
     * @param {number|null} categoryId
     * @param {string|null} orderField
     * @param {number|string} page
     * @return {Promise<{}>}
     */
    getWall(userId, q, categoryId, orderField, page) {
        let recentPostsSql;
        let featuredPostsSql;
        const promises = [];

        if (typeof userId === 'number') {
            recentPostsSql = queries.fastWallQuery
                .withParams([Number(userId), Number(userId)]);

            featuredPostsSql = queries.fastFeaturedPosts
                .withParams([Number(userId), Number(userId)])
                .withPage(0);
        } else {
            recentPostsSql = queries.wallQuery
            featuredPostsSql = queries.featuredPosts.withPage(0);
        }

        if (typeof categoryId === 'number' && Number.isSafeInteger(categoryId)) {
            recentPostsSql = recentPostsSql
                .addParams(categoryId)
                .withFilter('p.category_id');
        }

        if (typeof q === 'string') {
            recentPostsSql = recentPostsSql
                .addParams(`%${q.toLowerCase()}%`)
                .withFulTextSearch('p.title', 'p.description', 'p.body')
        }

        if (typeof orderField === 'string') {
            if (orderField === 'id'
                || orderField === 'likes'
                || orderField === 'live') {
                recentPostsSql = recentPostsSql.withOrderBy(orderField);
            }
        } else {
            recentPostsSql = recentPostsSql.withOrderBy('id');
        }

        recentPostsSql = recentPostsSql.withPage(Number(page) || 0);

        if (page === 0) {
            promises.push(database.executeQuery(featuredPostsSql).then((posts) => {
                return {featured: posts};
            }))
        } else {
            promises.push(Promise.resolve({featured: []}));
        }

        promises.push(database.executeQuery(recentPostsSql).then((posts) => {
            return {recent: posts};
        }))

        return Promise.all(promises)
            .then((results) => {
                return results.reduce((acc, p) => {
                    return Object.assign(p, acc);
                }, {});
            });
    }

    /**
     * Get post
     *
     * @param {number|null} userId
     * @param {number} postId
     * @return {Promise<{}>}
     */
    getPostById(userId, postId) {

        if (!(typeof postId === 'number' && Number.isSafeInteger(postId))) {
            return Promise.reject(new HttpError('Invalid post identifier', 400));
        }

        if (typeof userId === 'number') {
            return database.singleResultQuery(queries.getPostWithUser
                .withParams([Number(userId), Number(userId), Number(postId)]))
        }

        return database.singleResultQuery(queries.getPost.withParams([Number(postId)]));
    }

    /**
     * UPdate post
     *
     * @param {number} postId
     * @param {{}} data
     * @return {Promise<[]>}
     */
    updatePost(postId, data) {
        return database.singleResultQuery(queries.getPost.withParams([postId]))
            .then(() => {

                const tips = [];
                const images = [];

                if (data['tips'] && Array.isArray(data['tips'])) {
                    for (const tip of data['tips'] || []) {
                        tips.push(tip);
                    }
                } else if (data['tips']) {
                    tips.push(data['tips']);
                }

                if (data['imageUrl'] && Array.isArray(data['imageUrl'])) {
                    for (const image of data['imageUrl'] || []) {
                        for (const description of data['imageDescription'] || []) {
                            images.push({
                                src: image,
                                alt: description
                            });
                        }
                    }
                } else if (data['imageUrl']) {
                    images.push({
                        src: data['imageUrl'],
                        alt: data['imageUrl']
                    });
                }

                return database.executeQuery(queries.updatePost
                    .withParams([
                        data['title'],
                        data['description'],
                        (data['body'] || ''),
                        images.length > 0 ? 1 : 0,
                        images.length > 0 ? JSON.stringify(images) : null,
                        tips.length > 0 ? 1 : 0,
                        tips.length > 0 ? JSON.stringify(tips) : null,
                        Number(data['category']),
                        postId
                    ]))
            })
    }

    /**
     * Update likes counter
     *
     * @param {number|null} userId
     * @param {number|null} postId
     * @param {string|boolean} wasLiked
     * @return {Promise<[]>}
     */
    updatePostLikes(userId, postId, wasLiked) {
        let updatePromise

        if (typeof userId !== 'number') {
            return Promise.reject(new HttpError('User /api/users to obtain token', 401));
        }

        if (!(typeof postId === 'number' && Number.isSafeInteger(postId))) {
            return Promise.reject(new HttpError('Invalid post identifier', 400));
        }

        if (typeof wasLiked === 'string' && !/^(true|false)$/.test(wasLiked)) {
            return Promise.reject(new HttpError('Invalid string value for liked key', 400));
        } else if (typeof wasLiked !== 'boolean') {
            return Promise.reject(new HttpError('Expecting boolean data type for liked key', 400));
        }

        if (wasLiked === 'true' || wasLiked) {
            updatePromise = database.executeQuery(queries.userLikedPost.withParams([Number(postId), userId]))
        } else {
            updatePromise = database.executeQuery(queries.userDislikedPost.withParams([Number(postId), userId]));
        }

        return updatePromise
            .then(() => {
                return database.executeQuery(queries.updatePostLikes
                    .withParams([Number(postId), Number(postId)]))
            });
    }

    /**
     * Mark post as seen
     *
     * @param {number} userId
     * @param {number} postId
     * @return {Promise<[]>}
     */
    markPostAsSeen(userId, postId) {

        if (typeof userId !== 'number') {
            return Promise.reject(new HttpError('User /api/users to obtain token', 401));
        }

        if (!(typeof postId === 'number' && Number.isSafeInteger(postId))) {
            return Promise.reject(new HttpError('Invalid post identifier', 400));
        }

        return database.executeQuery(queries.userSeen.withParams([Number(postId), userId]))
    }

    /**
     * Update live listening
     *
     * @param {number|null} userId
     * @param {number|null} postId
     * @param {string|boolean} isListening
     * @return {Promise<[]>}
     */
    updatePostLiveListening(userId, postId, isListening) {
        let listenPromise = null;

        if (!(typeof postId === 'number' && Number.isSafeInteger(postId))) {
            return Promise.reject(new HttpError('Invalid post identifier', 400));
        }

        if (typeof isListening === 'string' && !/^(true|false)$/.test(wasLiked)) {
            return Promise.reject(new HttpError('Invalid string value for liked key', 400));
        } else if (typeof isListening !== 'boolean') {
            return Promise.reject(new HttpError('Expecting boolean data type for liked key', 400));
        }

        if (isListening === 'true' || isListening) {
            listenPromise = database.executeQuery(queries.incrementLiveUser.withParams([Number(postId)]))
        } else {
            listenPromise = database.executeQuery(queries.decrementLiveUse.withParams(postId));
        }

        return listenPromise
            .then(() => {
                return database.executeQuery(queries.updateLiveInPost
                    .withParams([Number(postId), Number(postId)]));
            });
    }

    /**
     * Register user
     * @param {any} pubSubSubscription
     * @return {Promise<number>}
     */
    registerUser(pubSubSubscription) {
        return database.executeInsertQuery(queries.createUser.withParams(JSON.stringify(pubSubSubscription) || null))
    }

    /**
     * Update user
     *
     * @param {number} userId
     * @param {any} pubSubSubscription
     * @return {Promise<[]>}
     */
    updatePubSubSubscription(userId, pubSubSubscription) {
        if (typeof userId !== 'number') {
            return Promise.reject(new HttpError('User /api/users to obtain token', 401));
        }

        if (typeof pubSubSubscription !== 'object') {
            return Promise.reject(new HttpError('Expecting a JSON object on sub key', 400));
        }

        return database.executeQuery(queries.updatePushInfo
            .withParams([JSON.stringify(pubSubSubscription), userId]))
    }

    /**
     *  Register token
     *
     * @param {number} userId
     * @return {{token: string}}
     */
    tokenForUserId(userId) {
        return {token: jwt.sign({userId: userId}, JWT_SECRET)}
    }

    /**
     * Process audio source
     *
     * @param req
     * @param res
     * @param {string} userId
     * @param {number} postId
     * @return {Promise<{url: string}>}
     */
    async getAudioUrlForPost(req, res, userId, postId) {

        if (!(typeof postId === 'number' && Number.isSafeInteger(postId))) {
            throw new HttpError('Invalid post identifier', 400);
        }

        try {
            const audioSource = await database
                .singleResultQuery(queries.getAudioSourceUrl
                    .withParams([Number(postId)]))

            this._plugins.get(audioSource.origin)
                .process(req, res, audioSource);

        } catch (e) {
            throw e;
        }
    }


    /**
     * Send push
     *
     * @param {number} postId
     * @param {number|null} to
     * @return {Promise<void>}
     */
    async sendPushNotifications(postId, to) {
        try {
            const post = await database.singleResultQuery(queries.getPost.withParams([Number(postId)]));

            let users;

            if (typeof to === 'number') {
                users = (await database.executeQuery(queries.getUserById.withParams(to)))
            } else {
                users = (await database.executeQuery(queries.getAllUsersWithPush));
            }

            users = users.map((u) => {
                u.sub = JSON.parse(u.sub);
                return u;
            });

            const notification = {
                "notification": {
                    "title": post.title,
                    "body": post.description.substring(0, 30) + '...',
                    "icon": "assets/icons/icon-152x152.png",
                    "vibrate": [100, 50, 100],
                    "data": {
                        "id": post.id
                    },
                    "actions": []
                }
            };

            users.forEach((u) => {
                webpush.sendNotification(u.sub, JSON.stringify(notification))
                    .then((e) => {
                        console.log("Notification sent", u.id);
                    })
                    .catch((error) => {
                        console.error("Push error to", u.id, notification, error);
                    });
            });

        } catch (e) {
            throw e;
        }
    }

    /**
     * Insert report
     *
     * @param {number|null} userId
     * @param {string|null} bodyElement
     * @return {Promise<number>}
     */
    insertBugReport(userId, bodyElement) {
        return database.executeInsertQuery(queries.insertBugReport.withParams([userId, bodyElement]))
    }
}

const controller = new Controller();

module.exports = controller
