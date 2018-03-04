/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */

import React, { Component } from 'react'
//import { join } from 'path-extra'
//import { connect } from 'react-redux'
//import { forEach, isNumber, get } from 'lodash'
//import { ProgressBar, Checkbox } from 'react-bootstrap'
//import { getHpStyle } from 'views/utils/game-utils'

import { EventEmitter } from 'events';
import * as localServer from './localserver.es';
import { OneDriveClient } from './onedrive.es';

export const ev = new EventEmitter();

//const { i18n } = window

//const __ = i18n['poi-plugin-map-hp'].__.bind(i18n['poi-plugin-map-hp'])

export const settingsClass = class PoiPluginMapHp extends Component {
  constructor(props) {
    super(props)
    this.state = {
    }
  }
  render() {
   return (
       <h1>Hello</h1>
   )
  }
}

export const pluginDidLoad = () => {
  //window.addEventListener('game.response', handleResponse)
    let od = new OneDriveClient('/tmp/credential');
    if (!od.authorized) {
        localServer.start().then(() => {
            return od.auth();
        }).done(() => {
            console.log(od);
            localServer.stop();
        });
    }
}

export const pluginWillUnload = () => {
  //window.removeEventListener('game.response', handleResponse)
  localServer.stop();
}
