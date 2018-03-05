import { ev, setSession, getLastSession } from './index.es';

export class StorageManager {
    async sessionInit() {
        this.session = {
            lastSession: getLastSession(),
            session: new Date(),
            events: [],
            eventsSize: 0,
            retrieved: [],
            uploadqueue: {},
            collector: setInterval(() => this.collect(), 120 * 1000),
        };
        if (this.session.lastSession === null) this.session.lastSession = new Date(0);
        this.session.folder = `events/${this.session.session.getTime()}`;
        setSession(this.session.session);
        let root = await this.list('/');
        if (!root.includes('data')) await this.createFolder('data');
        if (!root.includes('events')) await this.createFolder('events');
        await this.createFolder(this.session.folder);
        this.doRetrieve();
    }
    async sessionDeinit() {
        clearInterval(this.session.collector);
        this.collect();
        for (let id of Object.keys(this.session.uploadqueue)) {
            let upload = this.session.uploadqueue[id];
            if (upload) try { await upload; } finally {}
        }
    }
    async getItem(key) {
        return JSON.parse(await this.download('data/' + encodeURIComponent(key)));
    }
    async setItem(key, value) {
        await this.upload('data/' + encodeURIComponent(key), JSON.stringify(value));
    }
    async publish(type, message) {
        let msg = {type, date: Date.now(), message};
        let size = JSON.stringify(msg).length + 4;
        if (size > 1 * 1024 * 1024) throw new Error('Message too long');
        this.session.events.push(msg);
        this.session.eventsSize += size;
        if (this.session.eventsSize > 2 * 1024 * 1024) this.collect();
    }
    retrieve(type, since) {
        if (since === undefined) since = this.session.lastSession;
        return this.session.retrieved.filter(m => m.type === type && m.date >= since);
    }
    async collect() {
        if (this.session.events.length === 0) return;
        let data = JSON.stringify(this.session.events);
        this.session.events = [];
        this.session.eventsSize = 0;
        let id = Date.now();
        for (let retryCount = 0; retryCount < 3; retryCount++) {
            let upload = this.upload(this.session.folder + '/' + id, data);
            this.session.uploadqueue[id] = upload;
            try {
                await upload;
                break;
            } catch (err) {
                ev.emit('error', err);
            }
        }
        delete this.session.uploadqueue[id];
        return id;
    }
    async doRetrieve() {
        for (let retryCount = 0; retryCount < 3; retryCount++) try {
            this.session.retrieved = [];
            let sessions = await this.list('events');
            let s = this.session.lastSession.getTime();
            let e = this.session.session.getTime();
            sessions = sessions.filter(v => s < parseInt(v) && parseInt(v) < e).sort((a, b) => a - b);
            for (let v of sessions) {
                let datalist = await this.list('events/' + v);
                for (name of datalist) {
                    let data = JSON.parse(await this.download(`events/${v}/${name}`));
                    this.session.retrieved = this.session.retrieved.concat(data);
                }
            }
            break;
        } catch (err) {
            ev.emit('error', err);
        }
        ev.emit('retrieveFinished');
    }
}
