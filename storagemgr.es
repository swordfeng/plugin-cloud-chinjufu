import { ev, setSession, getLastSession } from './index.es';

export class StorageManager {
    async sessionInit() {
        this.session = {
            lastSession: getLastSession(),
            session: new Date(),
            events: [],
            retrieved: [],
            uploadqueue: {},
            collector: setInterval(() => this.collect(), 60 * 1000),
        };
        if (this.session.lastSession === null) this.session.lastSession = this.session.session;
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
        this.session.events.push({type, date: Date.now(), message});
    }
    async collect() {
        let data = JSON.stringify(this.session.events);
        this.session.events = [];
        let id = Date.now();
        let upload = this.upload(this.session.folder + '/' + id, data);
        this.session.uploadqueue[id] = upload;
        try {
            await upload;
        } catch (err) {
            ev.emit('error', err);
        }
        delete this.session.uploadqueue[id];
        return id;
    }
    async doRetrieve() {
        try {
            let sessions = await this.list('events');
            let s = this.session.lastSession.getTime();
            let e = this.session.session.getTime();
            sessions = sessions.filter(v => s < parseInt(v) && parseInt(v) < e).sort((a, b) => a - b);
            for (v of sessions) {
                let datalist = await this.list('events/' + v);
                for (name of datalist) {
                    let data = JSON.parse(await this.download(`events/${v}/${name}`));
                    this.session.retrieved = this.session.retrieved.concat(data);
                }
            }
        } catch (err) {
            ev.emit('error', err);
        }
        ev.emit('retriveFinished');
    }
}