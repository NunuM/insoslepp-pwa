const mysql = require('mysql');

const {HttpError} = require('./utils');
const configs = require('../configs.json');

const pool = mysql.createPool(configs.database);

class Database {
    /**
     * Execute query
     *
     * @param {Queries} query
     * @return {Promise<any[]>}
     */
    executeQuery(query) {
        return new Promise((resolve, reject) => {
            pool.query(query.sql, query.params, (error, results, info) => {
                if (error) reject(error)
                else resolve(results)
            });
        });
    }

    /**
     * Execute query
     *
     * @param {Queries} query
     * @return {Promise<{}>}
     */
    singleResultQuery(query) {
        return this.executeQuery(query)
            .then((results) => {
                if (results.length === 0) {
                    return Promise.reject(HttpError.notFound('not found'));
                } else {
                    return results[0];
                }
            });
    }

    /**
     * Execute query
     *
     * @param {Queries} query
     * @return {Promise<number>}
     */
    executeInsertQuery(query) {
        return this.executeQuery(query)
            .then((results) => {
                return results.insertId;
            });
    }
}

const database = new Database();

module.exports = database;
