import * as http from 'http';
import { ev } from './index.es';
import { URL } from 'url';

let server;

export const start = function start() {
    return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
            let data = Buffer(0)
            req.on('data', d => data = Buffer.concat([data, d]));
            req.on('end', () => {
                ev.emit('httpRequest', {
                    url: new URL(req.url, 'http://localhost:9080/'),
                    headers: req.headers,
                    data: data.toString('utf8'),
                });
                res.end();
            });
            res.headers['Cache-Control'] = 'no-cache';
        });
        server.listen(9080, 'localhost', err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export const stop = function stop() {
    return new Promise((resolve, reject) => {
        if (!server) return;
        server.close(() => resolve());
        server = undefined;
    });
}
