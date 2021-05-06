#!/usr/bin/env node

const fs = require('fs');

const mysql = require('mysql');
const configs = require('../configs.json');

let connection;

async function executeSqlFile(file) {
    for (const line of file.split(/^$/gm)) {
        console.log("Stmt:", line);

        const _ = await (new Promise((resolve, reject) => {
            connection.query(line, (err, results, fields) => {
                if (err) reject(err)
                else resolve(results)
            });
        }));
    }
}

if (process.argv[2] === '00') {

    const dbName = configs.database.database;

    delete configs.database.database;

    connection = mysql.createConnection(configs.database);

    console.log("Executing 00.sql");

    const file = fs.readFileSync('./migrations/00.sql').toString().replace(/:dbname/gm, dbName);

    executeSqlFile(file)
        .then(() => {
            console.log('migrated 00.sql');
            process.exit(0);
        }).catch((error) => {
        console.error('Error executing 00.sql', error);
        process.exit(1);
    });
} else {
    const fileName = process.argv[2];

    connection = mysql.createConnection(configs.database);

    console.log(`Executing ${fileName}.sql`);

    const file = fs.readFileSync(`./migrations/${fileName}.sql`).toString();

    executeSqlFile(file)
        .then(() => {
            console.log(`migrated ${fileName}.sql`);
            process.exit(0);
        }).catch((error) => {
        console.error(`Error migrating ${fileName}.sql`, error);
        process.exit(1);
    });
}


