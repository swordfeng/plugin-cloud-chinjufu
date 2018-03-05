import React, { Component } from 'react'
//import { join } from 'path-extra'
//import { connect } from 'react-redux'
//import { forEach, isNumber, get } from 'lodash'
//import { ProgressBar, Checkbox } from 'react-bootstrap'
//import { getHpStyle } from 'views/utils/game-utils'
import { Grid, Row, Col, Button } from 'react-bootstrap'

import { EventEmitter } from 'events';
import * as localServer from './localserver.es';
import { OneDriveClient } from './onedrive.es';
import { remote } from 'electron';
import ipc from 'lib/ipc';

export const ev = new EventEmitter();

//const { i18n } = window

//const __ = i18n['poi-plugin-map-hp'].__.bind(i18n['poi-plugin-map-hp'])

let credential;
let client;
let ipcObj;

function loadCredential() {
    credential = localStorage.getItem('poi-sync-credential');
    if (credential !== null) credential = JSON.parse(credential);
    if (!credential) credential = { type: 'none' };
}

function saveCredential() {
    localStorage.setItem('poi-sync-credential', JSON.stringify(credential));
}

export function getLastSession() {
    let date = localStorage.getItem('poi-sync-session');
    let lastSession;
    if (date === null) {
        lastSession = null;
        return;
    }
    lastSession = new Date(parseInt(date));
    return lastSession;
}
export function setSession(session) {
    localStorage.setItem('poi-sync-session', session.getTime());
}

export const settingsClass = class SyncSettings extends Component {
    constructor(props) {
        super(props)
        this.state = { type: credential.type };
        ev.on('reset', () => this.setState({ type: credential.type }));
        ev.on('ready', () => this.setState({ type: credential.type }));
    }
    reset = () => {
        credential = { type: 'none' };
        saveCredential();
        ev.emit('reset');
        if (client) client.deinit();
        client = null;
    }
    loginOneDrive = () => {
        ev.emit('reset');
        if (client) client.deinit();
        client = new OneDriveClient(odCred => {
            credential = {
                type: 'onedrive',
                credential: odCred
            };
            saveCredential();
        });
        localServer.start()
        .then(() => client.auth())
        .then(() => ev.emit('ready'))
        .then(() => localServer.stop())
        .catch(err => ev.emit('error', err));
    }
    render() {
        return (
            <Grid>
                <Row>
                    <Col xs={3}>Status: {this.state.type}</Col>
                    <Col xs={2}><Button onClick={this.reset}>Reset</Button></Col>
                    <Col xs={2}><Button onClick={this.loginOneDrive}>OneDrive</Button></Col>
                </Row>
            </Grid>
        )
    }
}

ev.on('ready', () => console.log('sync ready'));
ev.on('reset', () => console.log('sync reset'));
ev.on('retrieveFinished', () => console.log('sync retriveFinished'));
ev.on('error', err => console.error(err));

ev.on('ready', () => window.success(`Sync ready type: ${credential.type}`));
ev.on('reset', () => window.log(`Sync reset`));
ev.on('retrieveFinished', () => window.log(`Sync offline events ready`));
ev.on('error', err => window.error(`Sync ${err.name}: ${err.message}`));


class CloudChinjufuObject extends EventEmitter {
    constructor() {
        super()
        this.ready = false;
        ev.on('ready', () => {
            this.ready = true;
            this.emit('ready');
        });
        ev.on('reset', () => {
            this.ready = false;
            this.emit('reset');
        });
        ev.on('retrieveFinished', () => this.emit('retrieveFinished'));
        ev.on('error', err => {
            console.error(err);
            this.emit('error', err);
        });
    }
    async getItem(key) {
        if (!this.ready) throw new Error('Sync not ready');
        return await client.getItem(key);
    }
    async setItem(key, value) {
        if (!this.ready) throw new Error('Sync not ready');
        return await client.setItem(key, value);
    }
    async publish(type, message) {
        return await client.publish(key, value);
    }
    retrieve(type, since) {
        return client.retrieve(type, since);
    }
}

export const pluginDidLoad = () => {
    loadCredential();
    (async function () {
        if (credential.type === 'onedrive') {
            client = new OneDriveClient(odCred => {
                credential = {
                    type: 'onedrive',
                    credential: odCred
                };
                saveCredential();
            }, credential.credential);
            try {
                await client.init();
                ev.emit('ready');
            } catch (err) {
                throw err;
            }
        }
    })();
    remote.getCurrentWindow().on('close', cleanUp);
    window.cloudChinjufu = new CloudChinjufuObject();
    ipc.register('cloud-chinjufu', { ipc: () => window.cloudChinjufu });
}

function cleanUp() {
    ev.emit('reset');
    if (client) client.deinit();
    client = null;
    localServer.stop();
    remote.getCurrentWindow().removeListener('close', cleanUp);
    window.cloudChinjufu = undefined;
    ipc.unregisterAll('cloud-chinjufu');
}

export const pluginWillUnload = () => {
    cleanUp();
}
