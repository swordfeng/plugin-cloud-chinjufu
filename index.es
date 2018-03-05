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

export const ev = new EventEmitter();

//const { i18n } = window

//const __ = i18n['poi-plugin-map-hp'].__.bind(i18n['poi-plugin-map-hp'])

let credential;
let client;

function loadCredential() {
    credential = localStorage.getItem('poi-sync');
    if (credential !== null) credential = JSON.parse(credential);
    if (!credential) credential = { type: 'none' };
}

function saveCredential() {
    localStorage.setItem('poi-sync', JSON.stringify(credential));
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
    }
    loginOneDrive = () => {
        credential = { type: 'none' };
        ev.emit('reset');
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
        .then(() => localServer.stop());
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
}

export const pluginWillUnload = () => {
    localServer.stop();
}
