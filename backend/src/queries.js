const configs = require('../configs.json');

const PAGE_SIZE = configs.resultsPageSize;

class Queries {

    /**
     *
     * @param {string} queryName
     * @param {string} sql
     * @param {any[]} params
     */
    constructor(queryName, sql, params = []) {
        this._queryName = queryName;
        this._sql = sql;
        this._params = params;
    }

    get queryName() {
        return this._queryName;
    }

    set queryName(value) {
        this._queryName = value;
    }

    get sql() {
        return this._sql;
    }

    set sql(value) {
        this._sql = value;
    }

    get params() {
        return this._params;
    }

    set params(value) {
        this._params = value;
    }

    withParams(params) {
        return new Queries(this.queryName, this.sql, params);
    }

    addParams(value) {
        return new Queries(this.queryName, this.sql, [...this.params, value]);
    }

    withFilter(field) {
        const newSql = this.sql + this.whereOrAnd() + field + '=?';

        return new Queries(this.queryName, newSql, [...this.params]);
    }

    /**
     * @private
     * @return {string}
     */
    whereOrAnd() {
        if (this.sql.replace(/\(.*\)/gm, ' ').includes('WHERE')) {
            return ' AND ';
        } else {
            return ' WHERE ';
        }
    }

    withLikeFilter(field) {
        let newSql = this.sql + this.whereOrAnd() + field + ' like ? ';

        return new Queries(this.queryName, newSql, [...this.params]);
    }

    withFulTextSearch(...fields) {
        let newSql = this.sql + this.whereOrAnd() + ` MATCH(${fields.join(',')}) AGAINST (?)`;

        return new Queries(this.queryName, newSql, [...this.params]);
    }

    withOrderBy(field) {
        const newSql = this.sql + ' ORDER BY ' + field + ' DESC ';

        return new Queries(this.queryName, newSql, [...this.params]);
    }

    /**
     *
     * @param {number} page
     * @return {Queries}
     */
    withPage(page) {

        if (typeof page !== 'number') {
            page = 0;
        }

        if (page < 0) {
            page *= -1;
        }

        const newSql = this.sql + ' LIMIT ' + PAGE_SIZE + ' OFFSET ' + (page * PAGE_SIZE);

        return new Queries(this.queryName, newSql, [...this.params]);
    }
}

const WALL_POST_PROJECTION = `p.id,
p.title,
p.description,
p.is_audio,
p.has_tips,
p.is_gallery,
p.images,
p.likes,
p.live,
p.created,
p.updated,
c.name as category_name,
c.id as category_id`;

const POST_PROJECTION = `
p.id,
p.title,
p.description,
p.body,
p.is_audio,
p.has_tips,
p.is_gallery,
p.images,
p.likes,
p.live,
p.tips,
p.created,
p.updated,
c.name as category_name,
c.id as category_id`;

const USER_POST_INFO = `
(SELECT count(*) FROM user_post_likes usp WHERE usp.post_id=p.id AND usp.user_id=?) as liked,
(SELECT count(*) FROM user_saw_posts usw WHERE usw.post_id=p.id AND usw.user_id=?)  as seen
`;

const WALL_WITH_USER_INFO = `${WALL_POST_PROJECTION}, ${USER_POST_INFO}`;


module.exports = {
    categories: new Queries(
        'categories',
        "SELECT * FROM categories"
    ),
    searchWall: new Queries('searchWall',
        'SELECT id,title,likes, live FROM posts as p'
    ),
    featuredPosts: new Queries('featuredPosts',
        `SELECT ${WALL_POST_PROJECTION}, 0 as liked, 0 as seen FROM posts p JOIN categories c on c.id = p.category_id JOIN featured_posts fp on p.id = fp.post_id`
    ),
    fastFeaturedPosts: new Queries('',
        `SELECT ${WALL_WITH_USER_INFO} FROM posts p JOIN categories c on c.id = p.category_id JOIN featured_posts fp on p.id = fp.post_id`
    ),
    wallQuery: new Queries(
        'getWall',
        `SELECT ${WALL_POST_PROJECTION}, 0 as liked, 0 as seen FROM posts p JOIN categories c on c.id = p.category_id`
    ),
    fastWallQuery: new Queries(
        'getWallWithUserInfo',
        `SELECT ${WALL_WITH_USER_INFO} FROM posts p JOIN categories c on c.id = p.category_id`
    ),
    getPost: new Queries(
        'getPost',
        `SELECT ${POST_PROJECTION}, 0 as liked, 0 as seen FROM posts p JOIN categories c on c.id = p.category_id WHERE p.id=?`
    ),
    existsPost: new Queries('existsPost',
        'SELECT count(*) from posts WHERE id=?'
    ),
    updatePost: new Queries('updatePost',
        'UPDATE posts SET title=?, description=?, body=?, is_gallery=?, images=?, has_tips=?, tips=?, category_id=? WHERE id=?'
    ),
    getPostWithUser: new Queries(
        'getPostWithUser',
        `SELECT ${POST_PROJECTION}, ${USER_POST_INFO} FROM posts p JOIN categories c on c.id = p.category_id WHERE p.id = ?`
    ),
    doesUserLikedPost: new Queries(
        'userLikedPost',
        'SELECT count(*) as liked FROM user_post_likes WHERE post_id=? AND user_id=?', []
    ),
    doesUserSeenPost: new Queries(
        'userSeenPost',
        'SELECT count(*) as seen FROM user_saw_posts WHERE post_id=? AND user_id=?', []
    ),
    userLikedPost: new Queries(
        'userLiked',
            `INSERT INTO user_post_likes (post_id, user_id)
             VALUES (?, ?)`
    ),
    userDislikedPost: new Queries(
        'userDisliked',
        'DELETE FROM user_post_likes WHERE post_id=? AND user_id=?'
    ),
    userSeen: new Queries(
        'userSeen',
        'INSERT INTO user_saw_posts (post_id, user_id) VALUES (?,?)'
    ),
    getLiveCounter: new Queries(
        'liveCounter',
        `SELECT ${WALL_POST_PROJECTION}, l.counter FROM live_listen l JOIN posts p on p.id = l.post_id JOIN categories c on c.id = p.category_id ;`
    ),
    incrementLiveUser: new Queries(
        'newLiveUser',
        'UPDATE live_listen SET counter=counter+1 WHERE post_id=?'
    ),
    decrementLiveUse: new Queries(
        'decrementLiveUse',
        'UPDATE live_listen SET counter=counter-1 WHERE post_id=?'
    ),
    createUser: new Queries(
        'insertUser',
        'INSERT INTO users (sub) VALUES (?)'
    ),
    updatePostLikes: new Queries(
        'newLiveUser',
        'UPDATE posts SET likes=(select count(*) FROM user_post_likes upl WHERE upl.post_id=?) WHERE id=?'
    ),
    updateLiveInPost: new Queries(
        'newLiveUser',
        'UPDATE posts SET live=(select ll.counter FROM live_listen ll WHERE ll.post_id=?) WHERE id=?'
    ),
    getAudioSourceUrl: new Queries('getAudioSourceUrl',
        'SELECT sa.*, p.title, p.id FROM posts p JOIN audio_source sa ON sa.id = p.audio_source_id  WHERE p.id=?'
    ),
    insertPost: new Queries('insertPost',
        'INSERT INTO posts (title, description, body, is_audio, audio_source_id, images, tips, category_id) VALUES (?,?,?,?,?,?,?,(select id from categories where name =?))'
    ),
    createLiveListenForPost: new Queries('createLiveListenForPost',
        'INSERT INTO live_listen (post_id,counter) VALUES (?, 0)'
    ),
    updatePushInfo: new Queries('updatePushInfo',
        'UPDATE users SET sub=? WHERE id=?'
    ),
    getAllUsersWithPush: new Queries('getAllUsersWithPush',
        'SELECT * FROM users WHERE sub is not null'
    ),
    getUserById: new Queries('getUserById',
        'SELECT * FROM users WHERE id=?'
    ),
    insertBugReport: new Queries('insertBugReport',
        'INSERT INTO reported_bugs (user_id, message) VALUES (?,?)'
    ),
    insertAudioSource: new Queries('insertAudioSource',
        'INSERT INTO audio_source (source_uri, origin) VALUES (?, ?)'
    )
};
